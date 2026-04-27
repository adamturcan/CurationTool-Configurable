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

import type { AnnotationLayer, Notice, SpanCoordMap } from "../../types";
import type { useLayerOperations } from "./useLayerOperations";

type LayerOps = ReturnType<typeof useLayerOperations>;

/** Coordinates API calls for NER, segmentation, translation, tagging, and save */
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

  // --- Translation operations ---

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
        if (result.newActiveTab && result.translationsPatch) {
          const newText = result.translationsPatch.find(t => t.language === result.newActiveTab)?.text || "";
          setDraftText(newText);
        }
      }
      if (!result.ok) notify({ ...result.notice, retryAction: () => handleRunGlobalTranslate(targetLang) });
      else notify(result.notice);
    } catch (err) {
      handleError(err, () => handleRunGlobalTranslate(targetLang));
    } finally {
      setProcessingMessage(null);
    }
  }, [session, draftText, updateTranslations, setActiveTab, setDraftText, notify, handleError]);

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
        if (segmentId === "root" && result.newActiveTab && result.translationsPatch) {
          const newText = result.translationsPatch.find(t => t.language === result.newActiveTab)?.text || "";
          if (newText) setDraftText(newText);
        }
      }
      if (!result.ok) notify({ ...result.notice, retryAction: () => handleTranslateSegment(segmentId, lang) });
      else notify(result.notice);
    } catch (err) {
      handleError(err, () => handleTranslateSegment(segmentId, lang));
    } finally {
      setProcessingMessage(null);
    }
  }, [session, draftText, setDraftText, updateTranslations, setActiveTab, notify, handleError]);

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

  // --- Per-segment NER / SemTag ---

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

  // --- Text change ---

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

  // --- Global operations ---

  const handleRunGlobalNer = useCallback(async () => {
    setProcessingMessage("Running NER analysis...");
    setActiveSegmentId(undefined);
    try {
      const segments = session?.segments || [];

      let lastFailureNotice: Notice | null = null;

      if (segments.length <= 1) {
        // Unsegmented or single segment — run on full text per layer
        let originalOk = false;
        const originalLayer = resolveLayer("original");
        if (originalLayer) {
          const result = await annotationWorkflowService.runNer({ layer: originalLayer, segments, deletedApiKeys: session?.deletedApiKeys ?? [], lang: "original" }, requestConflictResolution);
          if (result.ok) {
            applyLayerPatch("original", result.layerPatch);
            updateSession({ deletedApiKeys: result.deletedApiKeys });
            originalOk = true;
          } else {
            lastFailureNotice = result.notice;
          }
        }

        const translations = useSessionStore.getState().session?.translations || [];
        let translationOkCount = 0;
        let translationAttempted = 0;
        for (const t of translations) {
          const freshSession = useSessionStore.getState().session;
          const tLayer = freshSession?.translations?.find(tr => tr.language === t.language);
          if (!tLayer?.text?.trim()) continue;
          translationAttempted++;

          const layer: AnnotationLayer = {
            text: tLayer.text || "",
            userSpans: tLayer.userSpans ?? [],
            apiSpans: tLayer.apiSpans ?? [],
            segmentTranslations: tLayer.segmentTranslations,
            editedSegmentTranslations: tLayer.editedSegmentTranslations,
          };

          const result = await annotationWorkflowService.runNer({ layer, segments: freshSession?.segments || [], deletedApiKeys: freshSession?.deletedApiKeys ?? [], lang: t.language }, requestConflictResolution);
          if (result.ok) {
            applyLayerPatch(t.language, result.layerPatch);
            if (result.deletedApiKeys) updateSession({ deletedApiKeys: result.deletedApiKeys });
            translationOkCount++;
          } else {
            lastFailureNotice = result.notice;
          }
        }

        const anySuccess = originalOk || translationOkCount > 0;
        if (!anySuccess && lastFailureNotice) {
          notify(lastFailureNotice);
        } else if (translationAttempted > 0) {
          const partial = !originalOk || translationOkCount < translationAttempted;
          notify({
            message: `NER completed for ${originalOk ? "original" : "0 original"} + ${translationOkCount} of ${translationAttempted} translation(s).`,
            tone: partial ? "warning" : "success",
          });
        } else if (originalOk) {
          notify({ message: "NER completed.", tone: "success" });
        }
      } else {
        // Per-segment NER with progress
        let successCount = 0;
        for (let i = 0; i < segments.length; i++) {
          setProgress("Running NER analysis...", i, segments.length);
          const seg = segments[i];

          // Read fresh session each iteration so previous patches are visible
          const currentSession = useSessionStore.getState().session;
          if (!currentSession) break;

          let segmentHadSuccess = false;

          // Original layer for this segment (built from fresh state)
          const originalLayer: AnnotationLayer = {
            text: currentSession.text || "",
            userSpans: currentSession.userSpans ?? [],
            apiSpans: currentSession.apiSpans ?? [],
          };

          const result = await annotationWorkflowService.runNer({ layer: originalLayer, activeSegmentId: seg.id, segments, deletedApiKeys: currentSession.deletedApiKeys ?? [], lang: "original" }, requestConflictResolution);
          if (result.ok) {
            applyLayerPatch("original", result.layerPatch);
            updateSession({ deletedApiKeys: result.deletedApiKeys });
            segmentHadSuccess = true;
          } else {
            lastFailureNotice = result.notice;
          }

          // Translation layers for this segment (counts as same step)
          const freshSession = useSessionStore.getState().session;
          const translations = freshSession?.translations || [];
          for (const t of translations) {
            const tLayer = freshSession?.translations?.find(tr => tr.language === t.language);
            if (!tLayer?.segmentTranslations?.[seg.id]?.trim()) continue;

            const layer: AnnotationLayer = {
              text: tLayer.text || "",
              userSpans: tLayer.userSpans ?? [],
              apiSpans: tLayer.apiSpans ?? [],
              segmentTranslations: tLayer.segmentTranslations,
              editedSegmentTranslations: tLayer.editedSegmentTranslations,
            };

            const result = await annotationWorkflowService.runNer({ layer, activeSegmentId: seg.id, segments, deletedApiKeys: freshSession?.deletedApiKeys ?? [], lang: t.language }, requestConflictResolution);
            if (result.ok) {
              applyLayerPatch(t.language, result.layerPatch);
              if (result.deletedApiKeys) updateSession({ deletedApiKeys: result.deletedApiKeys });
              segmentHadSuccess = true;
            } else {
              lastFailureNotice = result.notice;
            }
          }

          if (segmentHadSuccess) successCount++;
        }

        if (successCount === 0 && lastFailureNotice) {
          notify(lastFailureNotice);
        } else if (successCount < segments.length) {
          notify({ message: `NER completed for ${successCount} of ${segments.length} segment(s).`, tone: "warning" });
        } else {
          notify({ message: `NER completed for ${segments.length} segment(s).`, tone: "success" });
        }
      }
    } finally { setProcessingMessage(null); }
  }, [session, notify, setActiveSegmentId, requestConflictResolution, resolveLayer, applyLayerPatch, updateSession]);

  const handleRunGlobalSemTag = useCallback(async () => {
    setProcessingMessage("Running semantic tagging...");
    setActiveSegmentId(undefined);
    try {
      const segments = session?.segments || [];

      if (segments.length === 0) {
        const result = await taggingWorkflowService.runClassify(true, { activeSegmentId: undefined, segments: [], draftText, translations: session?.translations || [], text: session?.text || "", activeTab: "original", tags: session?.tags || [] });
        if (result.ok && result.tags) {
          updateSession({ tags: result.tags });
        }
        notify(result.notice);
      } else {
        let currentTags = session?.tags || [];
        let successCount = 0;
        let lastFailureNotice: Notice | null = null;

        for (let i = 0; i < segments.length; i++) {
          setProgress("Running semantic tagging...", i, segments.length);
          const seg = segments[i];
          const result = await taggingWorkflowService.runClassify(false, {
            activeSegmentId: seg.id,
            segments,
            draftText,
            translations: session?.translations || [],
            text: session?.text || "",
            activeTab: "original",
            tags: currentTags,
          });
          if (result.ok && result.tags) {
            currentTags = result.tags;
            successCount++;
          } else if (!result.ok) {
            lastFailureNotice = result.notice;
          }
        }

        updateSession({ tags: currentTags });
        if (successCount === 0 && lastFailureNotice) {
          notify(lastFailureNotice);
        } else if (successCount < segments.length) {
          notify({ message: `Tagged ${successCount} of ${segments.length} segment(s).`, tone: "warning" });
        } else {
          notify({ message: `Tagged ${segments.length} segment(s).`, tone: "success" });
        }
      }
    } finally {
      setProcessingMessage(null);
    }
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
