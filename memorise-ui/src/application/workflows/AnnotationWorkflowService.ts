import { getApiService } from "../../infrastructure/providers/apiProvider";
import { catchApiError } from "../errors";
import { resolveApiSpanConflicts, type ConflictPrompt } from "../../core/services/resolveApiSpanConflicts";
import type { NerSpan, AnnotationLayer, Segment, TranslationDTO, Notice, WorkflowResult } from "../../types";
import { SegmentLogic } from "../../core/entities/SegmentLogic";
import { SpanLogic } from "../../core/entities/SpanLogic";
import { TranslationLogic } from "../../core/entities/TranslationLogic";
import { v4 as uuidv4 } from "uuid";

/** Result of an annotation operation - carries span patches and dismissed API keys */
export type AnnotationResult = WorkflowResult & {
  layerPatch?: { userSpans?: NerSpan[]; apiSpans?: NerSpan[] };
  deletedApiKeys?: string[];
};

type LayerPatch = { userSpans?: NerSpan[]; apiSpans?: NerSpan[] };

/** Result of a workspace-wide NER run - one patch per affected language. */
export type GlobalNerResult = WorkflowResult & {
  layerPatches: Record<string, LayerPatch>;
  deletedApiKeys?: string[];
};



/**
 * NER span operations: run recognition, create/delete/update individual spans.
 * All methods return AnnotationResult with a layer patch for the session store.
 *
 * @category Application
 */
export class AnnotationWorkflowService {
  private apiService = getApiService();

  private getSpanId(s: NerSpan): string {
    return s.id ?? `span-${s.start}-${s.end}-${s.entity}`;
  }



  async runNer(session: { layer: AnnotationLayer, activeSegmentId?: string, segments: Segment[], deletedApiKeys: string[], lang?: string }, onConflict: (prompt: ConflictPrompt) => Promise<"api" | "existing">): Promise<AnnotationResult> {

    const { layer, activeSegmentId, segments, deletedApiKeys, lang } = session;

    let textToProcess = "";
    let globalOffset = 0;

    if (activeSegmentId && segments) {
      const translations = layer?.segmentTranslations;
      globalOffset = SegmentLogic.calculateGlobalOffset(activeSegmentId, segments, translations);

      const targetSeg = segments.find(s => s.id === activeSegmentId);
      if (!targetSeg) return { ok: false, notice: { message: "Segment not found.", tone: "error" } };

      textToProcess = translations
        ? (translations[activeSegmentId] || "")
        : targetSeg.text;
    } else {
      textToProcess = layer.text || "";
    }

    if (!textToProcess.trim()) {
      return { ok: false, notice: { message: "No text to process.", tone: "error" } };
    }

    try {
      let incomingSpans = await this.apiService.ner(textToProcess);

      if (globalOffset > 0) {
        incomingSpans = incomingSpans.map((span) => ({
          ...span, start: span.start + globalOffset, end: span.end + globalOffset
        }));
      }

      const isValid = (s: NerSpan) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start && !!s.entity?.trim();

      const userSpans = (layer.userSpans || []).filter(isValid);
      const apiSpans = (layer.apiSpans || []).filter(isValid);

      const filteredApiSpans = apiSpans.filter((s) => !deletedApiKeys.includes(SpanLogic.getBanKey(s)));

      const virtualText = layer.segmentTranslations
        ? segments.map(s => layer.segmentTranslations?.[s.id] ?? "").join("")
        : (layer.text || "");

      let segmentBoundaries: { start: number; end: number; index: number }[] | undefined;
      if (segments.length > 0) {
        if (layer.segmentTranslations) {
          let cursor = 0;
          segmentBoundaries = segments.map((s, i) => {
            const len = (layer.segmentTranslations?.[s.id] ?? "").length;
            const start = cursor;
            cursor += len;
            return { start, end: cursor, index: i + 1 };
          });
        } else {
          segmentBoundaries = segments.map((s, i) => ({ start: s.start, end: s.end, index: i + 1 }));
        }
      }

      const { nextUserSpans, nextApiSpans, conflictsHandled } = await resolveApiSpanConflicts({
        text: virtualText, incomingSpans, userSpans, existingApiSpans: filteredApiSpans, onConflict,
        segmentBoundaries, language: lang,
      });

      return { ok: true, notice: { message: conflictsHandled > 0 ? "NER completed with conflicts." : "NER completed.", tone: "success" }, layerPatch: { userSpans: nextUserSpans, apiSpans: nextApiSpans }, deletedApiKeys: [] };

    } catch (error) {
      return catchApiError(error, "run NER analysis");
    }
  }

  /**
   * Runs NER across the whole workspace: original layer + every translation layer, either once each (unsegmented mode) or per-segment with progress (segmented mode).
   * Carries the running per-language layer state forward across iterations so successive `runNer`calls see prior results — without this the next call's full-array `layerPatch` would clobber spans from the previous segment.
   */
  async runGlobalNer(
    session: {
      segments: Segment[];
      text?: string;
      userSpans?: NerSpan[];
      apiSpans?: NerSpan[];
      translations: TranslationDTO[];
      deletedApiKeys: string[];
    },
    onConflict: (prompt: ConflictPrompt) => Promise<"api" | "existing">,
    onProgress?: (current: number, total: number) => void
  ): Promise<GlobalNerResult> {
    const { segments, text, userSpans, apiSpans, translations, deletedApiKeys } = session;

    const layers = new Map<string, AnnotationLayer>();
    layers.set("original", { text: text ?? "", userSpans: userSpans ?? [], apiSpans: apiSpans ?? [] });
    for (const t of translations) layers.set(t.language, TranslationLogic.toAnnotationLayer(t));

    const changedLangs = new Set<string>();
    let runningDeletedApiKeys = deletedApiKeys;
    let lastFailureNotice: Notice | null = null;

    const runOne = async (lang: string, activeSegmentId?: string): Promise<boolean> => {
      const layer = layers.get(lang);
      if (!layer) return false;
      const result = await this.runNer(
        { layer, activeSegmentId, segments, deletedApiKeys: runningDeletedApiKeys, lang },
        onConflict
      );
      if (!result.ok) {
        lastFailureNotice = result.notice;
        return false;
      }
      if (result.layerPatch) {
        layers.set(lang, { ...layer, ...result.layerPatch });
        changedLangs.add(lang);
      }
      if (result.deletedApiKeys !== undefined) runningDeletedApiKeys = result.deletedApiKeys;
      return true;
    };

    const buildPatches = (): Record<string, LayerPatch> => {
      const out: Record<string, LayerPatch> = {};
      for (const lang of changedLangs) {
        const layer = layers.get(lang);
        if (layer) out[lang] = { userSpans: layer.userSpans, apiSpans: layer.apiSpans };
      }
      return out;
    };

    if (segments.length <= 1) {
      const originalOk = await runOne("original");

      let translationAttempted = 0;
      let translationOk = 0;
      for (const t of translations) {
        const tLayer = layers.get(t.language);
        if (!tLayer?.text?.trim()) continue;
        translationAttempted++;
        if (await runOne(t.language)) translationOk++;
      }

      const anySuccess = originalOk || translationOk > 0;
      let notice: Notice;
      if (!anySuccess) {
        notice = lastFailureNotice ?? { message: "No text to process.", tone: "error" };
      } else if (translationAttempted > 0) {
        const partial = !originalOk || translationOk < translationAttempted;
        notice = {
          message: `NER completed for ${originalOk ? "original" : "0 original"} + ${translationOk} of ${translationAttempted} translation(s).`,
          tone: partial ? "warning" : "success",
        };
      } else {
        notice = { message: "NER completed.", tone: "success" };
      }

      return { ok: anySuccess, notice, layerPatches: buildPatches(), deletedApiKeys: runningDeletedApiKeys };
    }

    let successCount = 0;
    for (let i = 0; i < segments.length; i++) {
      onProgress?.(i, segments.length);
      const seg = segments[i];
      let segmentHadSuccess = false;

      if (await runOne("original", seg.id)) segmentHadSuccess = true;

      for (const t of translations) {
        const tLayer = layers.get(t.language);
        if (!tLayer?.segmentTranslations?.[seg.id]?.trim()) continue;
        if (await runOne(t.language, seg.id)) segmentHadSuccess = true;
      }

      if (segmentHadSuccess) successCount++;
    }

    let notice: Notice;
    if (successCount === 0) {
      notice = lastFailureNotice ?? { message: "No text to process.", tone: "error" };
    } else if (successCount < segments.length) {
      notice = { message: `NER completed for ${successCount} of ${segments.length} segment(s).`, tone: "warning" };
    } else {
      notice = { message: `NER completed for ${segments.length} segment(s).`, tone: "success" };
    }

    return { ok: successCount > 0, notice, layerPatches: buildPatches(), deletedApiKeys: runningDeletedApiKeys };
  }

  deleteSpan(spanId: string, session: { layer: AnnotationLayer, deletedApiKeys: string[] }): AnnotationResult {

    const { layer, deletedApiKeys } = session;

    if (!layer) return { ok: false, notice: { message: "Layer not found.", tone: "error" } };

    const userSpans = layer.userSpans ?? [];
    const apiSpans = layer.apiSpans ?? [];


    const userSpanIndex = userSpans.findIndex(s => this.getSpanId(s) === spanId);

    if (userSpanIndex !== -1) {
      const nextUserSpans = [...userSpans];
      nextUserSpans.splice(userSpanIndex, 1);
      return { ok: true, notice: { message: "Span deleted.", tone: "success" }, layerPatch: { userSpans: nextUserSpans }, deletedApiKeys: [] };
    }

    const apiSpan = apiSpans.find(s => this.getSpanId(s) === spanId);
    if (apiSpan) {
      const keyToBan = SpanLogic.getBanKey(apiSpan);
      if (!deletedApiKeys.includes(keyToBan)) {
        return { ok: true, notice: { message: "Span deleted.", tone: "success" }, layerPatch: { apiSpans: apiSpans.filter((s) => this.getSpanId(s) !== spanId) }, deletedApiKeys: [...deletedApiKeys, keyToBan] };
      }
    }
    return { ok: false, notice: { message: "Span not found.", tone: "error" } };
  }

  createSpan(category: string, localStart: number, localEnd: number, session: { layer: AnnotationLayer, activeSegmentId: string, segments: Segment[] }): AnnotationResult {

    const { layer, activeSegmentId, segments } = session;

    let shiftOffset = 0;
    if (activeSegmentId && segments) {
      const translations = layer.segmentTranslations;
      shiftOffset = SegmentLogic.calculateGlobalOffset(activeSegmentId, segments, translations);
    }

    const newSpan: NerSpan = {
      id: uuidv4(),
      start: localStart + shiftOffset,
      end: localEnd + shiftOffset,
      entity: category,
      origin: "user"
    };

    return { ok: true, notice: { message: "Span created.", tone: "success" }, layerPatch: { userSpans: [...(layer.userSpans ?? []), newSpan] }, deletedApiKeys: [] };
  }

  updateSpanCategory(spanId: string, newCategory: string, session: { layer: AnnotationLayer }): AnnotationResult {

    const { layer } = session;
    if (!layer) return { ok: false, notice: { message: "Layer not found.", tone: "error" } };

    const updateSpans = (spans: NerSpan[]) =>
      spans.map((s) => (this.getSpanId(s) === spanId ? { ...s, entity: newCategory, id: spanId } : s));

    return {
      ok: true, notice: { message: "Span category updated.", tone: "success" }, layerPatch: {
        userSpans: updateSpans(layer.userSpans ?? []),
        apiSpans: updateSpans(layer.apiSpans ?? [])
      }
    };
  }

}

export const annotationWorkflowService = new AnnotationWorkflowService();