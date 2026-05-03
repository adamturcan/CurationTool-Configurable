import { useCallback, useState } from "react";
import { useSessionStore, useNotificationStore, useWorkspaceStore } from "../stores";
import { isAppError, toAppError } from "../../shared/errors";
import { presentAppError } from "../../application/errors";
import { useConflictResolution } from "./useConflictResolution";

import { annotationWorkflowService } from "../../application/workflows/AnnotationWorkflowService";
import { segmentWorkflowService } from "../../application/workflows/SegmentWorkflowService";
import { editorWorkflowService } from "../../application/workflows/EditorWorkflowService";
import { taggingWorkflowService } from "../../application/workflows/TaggingWorkflowService";
import { translationWorkflowService } from "../../application/workflows/TranslationWorkflowService";

import type { SpanCoordMap } from "../../types";
import type { useLayerOperations } from "./useLayerOperations";

type LayerOps = ReturnType<typeof useLayerOperations>;

/**
 * Editor controller hook. Each handler maps to a UI action (Run NER,Run Sem-Tag, Translate, Save, and so on) and delegates to the matching workflow service.
 * Handles the processing-state overlay and the shared conflict-resolution prompt.
 */
export function useEditorOperations(layers: LayerOps) {
  const { resolveLayer, applyLayerPatch } = layers;

  const session = useSessionStore((s) => s.session);
  const draftText = useSessionStore((s) => s.draftText);
  const setDraftText = useSessionStore((s) => s.setDraftText);
  const setActiveSegmentId = useSessionStore((s) => s.setActiveSegmentId);
  const activeTab = useSessionStore((s) => s.activeTab);
  const updateSession = useSessionStore((s) => s.updateSession);
  const setActiveTab = useSessionStore((state) => state.setActiveTab);
  const updateTranslations = useSessionStore((state) => state.updateTranslations);
  const notify = useNotificationStore.getState().enqueue;

  const [processingState, setProcessingState] = useState<{
    message: string;
    current?: number;
    total?: number;
  } | null>(null);
  const isProcessing = processingState !== null;
  const setProcessingMessage = (msg: string | null) =>
    setProcessingState(msg ? { message: msg } : null);
  const setProgress = (message: string, current: number, total: number) =>
    setProcessingState({ message, current, total });

  const cancelProcessing = useCallback(() => {
    setProcessingMessage(null);
    notify({ message: "Operation cancelled.", tone: "warning" });
  }, [notify]);

  const { conflictPrompt, requestConflictResolution, resolveConflictPrompt } = useConflictResolution();

  const handleError = useCallback((err: unknown, retryAction?: () => void) => {
    const appError = isAppError(err) ? err : toAppError(err);
    const notice = presentAppError(appError);
    notify({ ...notice, retryAction });
  }, [notify]);

  //Translation operations

  const handleRunGlobalTranslate = useCallback(async (targetLang: string) => {
    if (!session) return;
    setProcessingMessage(`Translating document to ${targetLang}...`);
    try {
      const result = await translationWorkflowService.addTranslation(targetLang, {
        segments: session.segments || [],
        translations: session.translations || [],
        text: draftText,
      }, (current, total) => setProgress(`Translating document to ${targetLang}...`, current, total));

      if (result.ok) {
        if (result.translationsPatch) updateTranslations(result.translationsPatch);
        if (result.newActiveTab) setActiveTab(result.newActiveTab);
      }
      if (!result.ok) notify({ ...result.notice, retryAction: () => handleRunGlobalTranslate(targetLang) });
      else notify(result.notice);
    } catch (err) {
      handleError(err, () => handleRunGlobalTranslate(targetLang));
    } finally {
      setProcessingMessage(null);
    }
  }, [session, draftText, updateTranslations, setActiveTab, notify, handleError]);

  const handleTranslateSegment = useCallback(async (segmentId: string, lang: string) => {
    if (!session) return;
    setProcessingMessage(`Translating segment to ${lang}...`);
    try {
      const result = await translationWorkflowService.addSegmentTranslation(lang, segmentId, {
        segments: session.segments || [],
        translations: session.translations || [],
        text: draftText,
      });

      if (result.ok) {
        if (result.translationsPatch) updateTranslations(result.translationsPatch);
        if (result.newActiveTab) setActiveTab(result.newActiveTab);
      }
      if (!result.ok) notify({ ...result.notice, retryAction: () => handleTranslateSegment(segmentId, lang) });
      else notify(result.notice);
    } catch (err) {
      handleError(err, () => handleTranslateSegment(segmentId, lang));
    } finally {
      setProcessingMessage(null);
    }
  }, [session, draftText, updateTranslations, setActiveTab, notify, handleError]);

  const handleDeleteSegmentTranslation = useCallback((lang: string, segmentId: string) => {
    if (!session) return;
    const result = translationWorkflowService.deleteSegmentTranslation(lang, segmentId, {
      segments: session.segments || [],
      translations: session.translations || [],
    });
    if (result.ok && result.translationsPatch) {
      updateTranslations(result.translationsPatch);
    }
    notify(result.notice);
  }, [session, updateTranslations, notify]);

  const handleUpdateSegmentTranslation = useCallback(async (segmentId: string, lang: string) => {
    if (!session) return;
    setProcessingMessage(`Updating translation (${lang})...`);
    try {
      const result = await translationWorkflowService.updateSegmentTranslation(lang, segmentId, {
        segments: session.segments || [],
        translations: session.translations || [],
      });
      if (result.ok && result.translationsPatch) {
        updateTranslations(result.translationsPatch);
      }
      if (!result.ok) notify({ ...result.notice, retryAction: () => handleUpdateSegmentTranslation(segmentId, lang) });
      else notify(result.notice);
    } catch (err) {
      handleError(err, () => handleUpdateSegmentTranslation(segmentId, lang));
    } finally {
      setProcessingMessage(null);
    }
  }, [session, updateTranslations, notify, handleError]);

  // Per-segment NER / SemTag

  const handleRunSegmentNer = useCallback(async (segmentId: string, lang: string) => {
    setProcessingMessage(`Running NER on segment (${lang})...`);
    setActiveSegmentId(segmentId);
    const layer = resolveLayer(lang);
    if (layer && segmentId) {
      const result = await annotationWorkflowService.runNer({ layer, activeSegmentId: segmentId, segments: session?.segments || [], deletedApiKeys: session?.deletedApiKeys ?? [], lang }, requestConflictResolution);
      if (result.ok) {
        applyLayerPatch(lang, result.layerPatch);
        updateSession({ deletedApiKeys: result.deletedApiKeys });
      }
      if (!result.ok) notify({ ...result.notice, retryAction: () => handleRunSegmentNer(segmentId, lang) });
      else notify(result.notice);
    }
    setProcessingMessage(null);
  }, [notify, setActiveSegmentId, session, requestConflictResolution, resolveLayer, applyLayerPatch, updateSession]);

  const handleRunSegmentSemTag = useCallback(async (segmentId: string, lang: string) => {
    setProcessingMessage(`Running Sem-Tag on segment (${lang})...`);
    setActiveSegmentId(segmentId);
    const result = await taggingWorkflowService.runClassify(false, { activeSegmentId: segmentId, segments: session?.segments || [], draftText, translations: session?.translations || [], text: session?.text || "", activeTab: lang, tags: session?.tags || [] });
    if (result.ok && result.tags) {
      updateSession({ tags: result.tags });
      useSessionStore.getState().setTagPanelOpen(true);
    }
    if (!result.ok) notify({ ...result.notice, retryAction: () => handleRunSegmentSemTag(segmentId, lang) });
    else notify(result.notice);
    setProcessingMessage(null);
  }, [notify, setActiveSegmentId, session, draftText, updateSession]);

  // Text change

  const handleTextChange = useCallback((segmentId: string, text: string, liveCoords: SpanCoordMap | undefined, deadIds?: string[], localLang?: string) => {
    const lang = localLang || "original";
    const layer = resolveLayer(lang);
    if (!layer) return;
    const targetSegmentId = segmentId === "root" ? "" : segmentId;
    const result = editorWorkflowService.handleTextChange(
      text, targetSegmentId, lang,
      { fullText: draftText, segments: session?.segments || [] },
      layer, liveCoords, deadIds
    );
    if (!result) return;
    setDraftText(result.draftText);
    applyLayerPatch(result.lang, result.layerPatch);
  }, [session, draftText, setDraftText, resolveLayer, applyLayerPatch]);

  // Global operations

  const handleRunGlobalNer = useCallback(async () => {
    if (!session) return;
    setProcessingMessage("Running NER analysis...");
    setActiveSegmentId(undefined);
    try {
      const result = await annotationWorkflowService.runGlobalNer(
        {
          segments: session.segments || [],
          text: session.text,
          userSpans: session.userSpans,
          apiSpans: session.apiSpans,
          translations: session.translations || [],
          deletedApiKeys: session.deletedApiKeys ?? [],
        },
        requestConflictResolution,
        (current, total) => setProgress("Running NER analysis...", current, total)
      );
      for (const [lang, patch] of Object.entries(result.layerPatches)) {
        applyLayerPatch(lang, patch);
      }
      if (result.deletedApiKeys !== undefined) updateSession({ deletedApiKeys: result.deletedApiKeys });
      notify(result.notice);
    } finally { setProcessingMessage(null); }
  }, [session, notify, setActiveSegmentId, requestConflictResolution, applyLayerPatch, updateSession]);

  const handleRunGlobalSemTag = useCallback(async () => {
    if (!session) return;
    setProcessingMessage("Running semantic tagging...");
    setActiveSegmentId(undefined);
    try {
      const result = await taggingWorkflowService.runGlobalClassify(
        {
          segments: session.segments || [],
          draftText,
          translations: session.translations || [],
          text: session.text || "",
          tags: session.tags || [],
        },
        (current, total) => setProgress("Running semantic tagging...", current, total)
      );
      if (result.tags) updateSession({ tags: result.tags });
      notify(result.notice);
    } finally { setProcessingMessage(null); }
  }, [session, draftText, notify, setActiveSegmentId, updateSession]);

  const handleSave = useCallback(async () => {
    if (!session) return;
    setProcessingMessage("Saving workspace...");
    try {
      const result = await editorWorkflowService.saveWorkspace(session, draftText);
      if (result.ok) {
        if (result.sessionPatch) updateSession(result.sessionPatch);
        if (result.workspaceMetadataPatch) useWorkspaceStore.getState().updateWorkspaceMetadata(session.id, result.workspaceMetadataPatch);
      }
      notify(result.notice);
    } finally { setProcessingMessage(null); }
  }, [session, draftText, notify, updateSession]);

  const handleRunGlobalSegment = useCallback(async () => {
    setProcessingMessage("Segmenting text...");
    try {
      const result = await segmentWorkflowService.runAutoSegmentation({ text: draftText, translations: session?.translations, segments: session?.segments }, activeTab);
      if (result.ok && result.patch) {
        updateSession(result.patch);
      }
      if (result.notice) {
        notify(result.notice);
      }
    } finally {
      setProcessingMessage(null);
    }
  }, [session?.segments, session?.translations, activeTab, notify, updateSession, draftText]);

  return {
    isProcessing,
    processingState,
    cancelProcessing,
    conflictPrompt,
    resolveConflictPrompt,
    handleRunGlobalNer,
    handleRunGlobalSemTag,
    handleRunGlobalSegment,
    handleRunGlobalTranslate,
    handleSave,
    handleTranslateSegment,
    handleDeleteSegmentTranslation,
    handleUpdateSegmentTranslation,
    handleRunSegmentNer,
    handleRunSegmentSemTag,
    handleTextChange,
  };
}
