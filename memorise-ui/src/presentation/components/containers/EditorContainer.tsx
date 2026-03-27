import React, { useCallback, useMemo, useState } from "react";
import { Box, Menu, MenuItem, Typography } from "@mui/material";

import CallSplitIcon from "@mui/icons-material/CallSplit";

import { useSessionStore } from "../../stores/sessionStore";
import { useNotificationStore } from "../../stores/notificationStore";
import { useLanguageOptions } from "../../hooks/useLanguageOptions";
import { useActionGuard } from "../../hooks/useActionGuard";
import type { ActionGuardActions } from "../../hooks/useActionGuard";
import ConflictResolutionDialog from "../editor/dialogs/ConflictResolutionDialog";
import ActionGuardDialog from "../editor/dialogs/ActionGuardDialog";

import { annotationWorkflowService } from "../../../application/services/AnnotationWorkflowService";
import { segmentWorkflowService } from "../../../application/services/SegmentWorkflowService";
import { translationWorkflowService } from "../../../application/services/TranslationWorkflowService";
import { SegmentLogic } from "../../../core/domain/entities/SegmentLogic";
import { SpanLogic } from "../../../core/domain/entities/SpanLogic";

import EditorGlobalMenu from "../editor/menus/EditorGlobalMenu.tsx";
import CategoryMenu from "../editor/menus/CategoryMenu.tsx";
import { SegmentBlock } from "../editor/SegmentBlock";
import type { SegmentHandlers, SegmentTranslationHandlers } from "../editor/SegmentBlock";
import { SegmentDragProvider } from "../editor/context/SegmentDragContext";
import type { NerSpan } from "../../../types/NotationEditor";

import { COLORS, SPLIT_DELIMITERS, getSpanId, safeSubstring, normalizeReplacement } from "../editor/utils/editorUtils";
import { useLayerOperations } from "../../hooks/useLayerOperations";
import { useEditorOperations } from "../../hooks/useEditorOperations";

const EditorContainer: React.FC = () => {
  const sessionStore = useSessionStore();
  const notify = useNotificationStore.getState().enqueue;
  const { session, draftText, activeSegmentId, setActiveSegmentId } = sessionStore;

  const setTagPanelOpen = useSessionStore((state) => state.setTagPanelOpen);
  const isTagPanelOpen = useSessionStore((state) => state.isTagPanelOpen);

  const [activeSpan, setActiveSpan] = useState<NerSpan | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [cmReplaceFn, setCmReplaceFn] = useState<((text: string) => void) | null>(null);
  const [newSelection, setNewSelection] = useState<{ start: number; end: number; top: number; left: number, segmentId?: string, localLang?: string, virtualStart?: number } | null>(null);

  const [actionLangContext, setActionLangContext] = useState("original");

  const [splitAnchor, setSplitAnchor] = useState<{ top: number; left: number, pos: number, segmentId: string } | null>(null);
  const [draggingFromIndex, setDraggingFromIndex] = useState<number | null>(null);

  const { languageOptions, isLanguageListLoading } = useLanguageOptions();

  const guardActions: ActionGuardActions = useMemo(() => ({
    translateSegment: async (segmentId: string, lang: string) => {
      const fresh = useSessionStore.getState().session;
      const result = await translationWorkflowService.addSegmentTranslation(lang, segmentId, {
        segments: fresh?.segments || [],
        translations: fresh?.translations || [],
      });
      if (result.ok && result.translationsPatch) {
        useSessionStore.getState().updateTranslations(result.translationsPatch);
      }
      if (!result.ok) throw new Error(result.notice.message);
    },
    deleteSegmentTranslation: (lang: string, segmentId: string) => {
      const fresh = useSessionStore.getState().session;
      const currentLayer = fresh?.translations?.find(t => t.language === lang);
      if (currentLayer) {
        const oldSegTrans = currentLayer.segmentTranslations || {};
        const deletedText = oldSegTrans[segmentId] || "";
        const segments = fresh?.segments || [];
        const deletedStart = SegmentLogic.calculateGlobalOffset(segmentId, segments, oldSegTrans);
        const deletedEnd = deletedStart + deletedText.length;

        const newSegs = { ...oldSegTrans };
        delete newSegs[segmentId];
        const newFullText = segments.map(s => newSegs[s.id] || "").join("");

        let nextUserSpans = SpanLogic.removeSpansInRange(currentLayer.userSpans || [], deletedStart, deletedEnd);
        nextUserSpans = SpanLogic.shiftSpansFrom(nextUserSpans, deletedEnd, -deletedText.length);
        let nextApiSpans = SpanLogic.removeSpansInRange(currentLayer.apiSpans || [], deletedStart, deletedEnd);
        nextApiSpans = SpanLogic.shiftSpansFrom(nextApiSpans, deletedEnd, -deletedText.length);

        const translations = (fresh?.translations || []).map(t =>
          t.language === lang ? { ...t, segmentTranslations: newSegs, text: newFullText, userSpans: nextUserSpans, apiSpans: nextApiSpans } : t
        );
        useSessionStore.getState().updateSession({ translations });
      }
    },
  }), []);

  const { guardJoin, guardSplit, guardShift, dialogProps: guardDialogProps, closeDialog: closeGuardDialog } = useActionGuard(guardActions);

  const layers = useLayerOperations();
  const { resolveLayer, applyLayerPatch, markSegmentEdited } = layers;

  const ops = useEditorOperations(layers);

  // --- Span interactions (will be extracted in Step 2) ---

  const closeEditMenu = useCallback(() => {
    setActiveSpan(null);
    setMenuAnchor(null);
    setCmReplaceFn(null);
  }, []);

  const handleSpanClick = useCallback((span: NerSpan, element: HTMLElement, replaceFn: any, localLang: string, vStart: number) => {
    setNewSelection(null);
    const globalizedSpan = { ...span, start: span.start + vStart, end: span.end + vStart };
    const id = getSpanId(globalizedSpan);
    setActiveSpan({ ...globalizedSpan, id });
    setActionLangContext(localLang);
    setMenuAnchor(element);
    setCmReplaceFn(() => replaceFn);
  }, []);

  const handleCreateSpan = useCallback((category: string) => {
    if (!newSelection || !newSelection.localLang) return;
    setActiveSegmentId(newSelection.segmentId);

    const layer = resolveLayer(newSelection.localLang);
    if (layer && newSelection.segmentId) {
      const result = annotationWorkflowService.createSpan(category, newSelection.start, newSelection.end, { layer, activeSegmentId: newSelection.segmentId, segments: session?.segments ?? [] });
      if (result.ok) {
        applyLayerPatch(newSelection.localLang, result.layerPatch);
        markSegmentEdited(newSelection.segmentId, newSelection.localLang);
      }
    }

    setNewSelection(null);
  }, [newSelection, setActiveSegmentId, session, resolveLayer, applyLayerPatch, markSegmentEdited]);

  const handleSelectionChange = useCallback((sel: { start: number; end: number; top: number; left: number } | null, segmentId: string, localLang: string, virtualStart: number) => {
    if (!sel) {
      setNewSelection(null);
      setSplitAnchor(null);
      return;
    }

    const segmentText = segmentId === "root" ? draftText : (session?.segments?.find(s => s.id === segmentId)?.text || "");
    const selectedText = segmentText.substring(sel.start, sel.end).trim();
    const isDelimiter = selectedText.length === 1 && SPLIT_DELIMITERS.includes(selectedText);

    if (isDelimiter && localLang === "original") {
      setActiveSegmentId(segmentId);
      closeEditMenu();
      setNewSelection(null);
      setSplitAnchor({ top: sel.top, left: sel.left, pos: virtualStart + sel.end, segmentId });
    } else {
      setSplitAnchor(null);
      closeEditMenu();
      setNewSelection({ ...sel, segmentId, localLang, virtualStart });
    }
  }, [session?.segments, draftText, closeEditMenu, setActiveSegmentId]);

  // --- Segment split/merge (will be extracted in Step 3) ---

  const handleJoinUp = useCallback((segmentId: string) => {
    const idx = session?.segments?.findIndex(s => s.id === segmentId) ?? -1;
    if (idx <= 0 || !session?.segments) return;

    const seg1Id = session.segments[idx - 1].id;
    const segments = session.segments;
    const translations = session.translations || [];

    guardJoin(seg1Id, segmentId, segments, translations, () => {
      const fresh = useSessionStore.getState().session;
      const result = segmentWorkflowService.joinSegments(seg1Id, segmentId, {
        translations: fresh?.translations || [],
        segments: fresh?.segments || [],
      });
      if (result.ok && result.patch) {
        useSessionStore.getState().updateSession(result.patch);
      }
      notify(result.notice);
    });
  }, [session?.segments, session?.translations, notify, guardJoin]);

  const handleConfirmSplit = useCallback(() => {
    if (!splitAnchor) return;
    const { pos, segmentId } = splitAnchor;
    const segments = session?.segments || [];
    const translations = session?.translations || [];

    setSplitAnchor(null);

    guardSplit(segmentId, segments, translations, () => {
      const fresh = useSessionStore.getState().session;
      const freshDraft = useSessionStore.getState().draftText;
      const result = segmentWorkflowService.splitSegment(pos, {
        text: freshDraft,
        translations: fresh?.translations || [],
        segments: fresh?.segments || [],
      }, segmentId);
      if (result.ok && result.patch) {
        useSessionStore.getState().updateSession(result.patch);
      }
      notify(result.notice);
    });
  }, [splitAnchor, session?.translations, session?.segments, notify, guardSplit]);

  const handleShiftBoundary = useCallback((sourceSegmentId: string, globalTargetPos: number) => {
    const segments = session?.segments || [];
    const translations = session?.translations || [];

    setDraggingFromIndex(null);

    guardShift(sourceSegmentId, globalTargetPos, segments, translations, async () => {
      const fresh = useSessionStore.getState().session;
      const freshDraft = useSessionStore.getState().draftText;
      const result = await segmentWorkflowService.shiftSegmentBoundary(sourceSegmentId, globalTargetPos, {
        text: freshDraft,
        translations: fresh?.translations || [],
        segments: fresh?.segments || [],
      });
      if (result.ok && result.patch) {
        useSessionStore.getState().updateSession(result.patch);
        if (result.patch.text) {
          useSessionStore.getState().setDraftText(result.patch.text);
        }
      }
      notify(result.notice);
    });
  }, [session?.segments, session?.translations, notify, guardShift]);

  // --- Span text update ---

  const handleUpdateSpanText = useCallback((newText: string) => {
    if (!activeSpan) return;
    const normalized = normalizeReplacement(newText);
    if (normalized.trim().length === 0) {
      const layer = resolveLayer(actionLangContext);
      if (layer && activeSpan.id) {
        const result = annotationWorkflowService.deleteSpan(activeSpan.id, { layer, deletedApiKeys: session?.deletedApiKeys ?? [] });
        if (result.ok) {
          applyLayerPatch(actionLangContext, result.layerPatch);
          if (result.deletedApiKeys) sessionStore.updateSession({ deletedApiKeys: result.deletedApiKeys });
          markSegmentEdited(activeSegmentId, actionLangContext);
        }
        notify(result.notice);
      }
      closeEditMenu();
      return;
    }
    cmReplaceFn?.(normalized);
    markSegmentEdited(activeSegmentId, actionLangContext);
    closeEditMenu();
  }, [activeSpan, cmReplaceFn, closeEditMenu, actionLangContext, session, draftText, activeSegmentId, resolveLayer, applyLayerPatch, markSegmentEdited, sessionStore, notify]);

  const virtualElement = newSelection ? ({ getBoundingClientRect: () => ({ top: newSelection.top, left: newSelection.left, bottom: newSelection.top, right: newSelection.left, width: 0, height: 0 }), nodeType: 1 } as unknown as HTMLElement) : null;

  return (
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box", overflow: "hidden", backgroundColor: "transparent" }}>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", pt: 2, pb: 1, zIndex: 50 }}>
        <EditorGlobalMenu
          onNer={ops.handleRunGlobalNer}
          onSegment={ops.handleRunGlobalSegment}
          onSemTag={ops.handleRunGlobalSemTag}
          onSave={ops.handleSave}
          onTranslateAll={ops.handleRunGlobalTranslate}
          isProcessing={ops.isProcessing}
          isTagPanelOpen={isTagPanelOpen}
          onToggleTagPanel={(isOpen) => {
            setTagPanelOpen(isOpen);
            if (isOpen) {
              setActiveSegmentId(undefined);
            }
          }}
          hasActiveSegment={!!activeSegmentId && activeSegmentId !== "root"}
          hasSegments={(session?.segments?.length ?? 0) > 0}
          isAlreadySegmented={(session?.segments?.length ?? 0) > 1}
          languageOptions={languageOptions}
          isLanguageListLoading={isLanguageListLoading}
        />
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: "auto", width: "100%", px: { xs: 2, md: 4 }, py: 2 }}>
        <Box sx={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.04)", overflow: "hidden", backgroundColor: "transparent" }}>
          {!session?.segments || session.segments.length === 0 ? (
            <SegmentDragProvider onDraggingChange={setDraggingFromIndex} draggingFromIndex={draggingFromIndex}>
              <SegmentBlock
                segment={{ id: "root", start: 0, end: draftText.length, text: draftText }}
                index={0}
                session={session}
                display={{ isActive: activeSegmentId === "root", isDragging: false, dropDisabled: false }}
                handlers={{
                  onActivate: () => setActiveSegmentId("root"),
                  onJoinUp: handleJoinUp,
                  onRunNer: ops.handleRunSegmentNer,
                  onRunSemTag: ops.handleRunSegmentSemTag,
                  onSpanClick: handleSpanClick,
                  onSelectionChange: handleSelectionChange,
                  onTextChange: ops.handleTextChange,
                  onShiftBoundary: handleShiftBoundary,
                }}
                translationHandlers={{
                  onAddTranslation: ops.handleTranslateSegment,
                  onDeleteTranslation: ops.handleDeleteSegmentTranslation,
                  onUpdateTranslation: ops.handleUpdateSegmentTranslation,
                  languageOptions: languageOptions,
                  isLanguageListLoading: isLanguageListLoading,
                }}
                dragHandlers={{}}
              />
            </SegmentDragProvider>
          ) : (
            <SegmentDragProvider onDraggingChange={setDraggingFromIndex} draggingFromIndex={draggingFromIndex}>
              {session.segments.map((segment, idx) => {
                const isDragging = draggingFromIndex !== null;
                const dropDisabled = draggingFromIndex !== null && idx <= draggingFromIndex;

                const handlers: SegmentHandlers = {
                  onActivate: () => setActiveSegmentId(segment.id),
                  onJoinUp: handleJoinUp,
                  onRunNer: ops.handleRunSegmentNer,
                  onRunSemTag: ops.handleRunSegmentSemTag,
                  onSpanClick: handleSpanClick,
                  onSelectionChange: handleSelectionChange,
                  onTextChange: ops.handleTextChange,
                  onShiftBoundary: handleShiftBoundary,
                  onInvalidDrop: () => notify({ message: "Cannot drop boundary here — target is above the source or showing a translation view.", tone: "warning" }),
                };

                const translationHandlers: SegmentTranslationHandlers = {
                  onAddTranslation: ops.handleTranslateSegment,
                  onDeleteTranslation: ops.handleDeleteSegmentTranslation,
                  onUpdateTranslation: ops.handleUpdateSegmentTranslation,
                  languageOptions: languageOptions,
                  isLanguageListLoading: isLanguageListLoading,
                };

                return (
                  <SegmentBlock
                    key={segment.id}
                    segment={segment}
                    index={idx}
                    session={session}
                    display={{ isActive: activeSegmentId === segment.id, isDragging, dropDisabled }}
                    handlers={handlers}
                    translationHandlers={translationHandlers}
                    dragHandlers={{ prevSegmentId: idx > 0 ? session.segments?.[idx - 1].id : undefined }}
                  />
                );
              })}
            </SegmentDragProvider>
          )}
        </Box>
        <Box sx={{ minHeight: "100px" }} />
      </Box>

      {/* MENUS */}
      <CategoryMenu
        anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeEditMenu}
        onCategorySelect={(c) => {
          if (activeSpan?.id) {
            const layer = resolveLayer(actionLangContext);
            if (layer) {
              const result = annotationWorkflowService.updateSpanCategory(activeSpan.id, c, { layer });
              if (result.ok) {
                applyLayerPatch(actionLangContext, result.layerPatch);
                markSegmentEdited(activeSegmentId, actionLangContext);
              }
              notify(result.notice);
            }
          }
          closeEditMenu();
        }}
        showDelete={true}
        onDelete={() => {
          if (activeSpan?.id) {
            const layer = resolveLayer(actionLangContext);
            if (layer) {
              const result = annotationWorkflowService.deleteSpan(activeSpan.id, { layer, deletedApiKeys: session?.deletedApiKeys ?? [] });
              if (result.ok) {
                applyLayerPatch(actionLangContext, result.layerPatch);
                if (result.deletedApiKeys) sessionStore.updateSession({ deletedApiKeys: result.deletedApiKeys });
                markSegmentEdited(activeSegmentId, actionLangContext);
              }
              notify(result.notice);
            }
            closeEditMenu();
          }
        }}
        spanText={activeSpan ? safeSubstring(draftText, activeSpan.start, activeSpan.end) : ""}
        onTextUpdate={handleUpdateSpanText}
      />

      <CategoryMenu anchorEl={virtualElement} open={Boolean(virtualElement)} onClose={() => setNewSelection(null)} onCategorySelect={handleCreateSpan} showDelete={false} />

      <Menu
        open={Boolean(splitAnchor)}
        anchorReference="anchorPosition"
        anchorPosition={splitAnchor ? { top: splitAnchor.top, left: splitAnchor.left } : undefined}
        onClose={() => setSplitAnchor(null)}
        PaperProps={{ sx: { borderRadius: 2, mt: 1, boxShadow: "0 8px 16px rgba(0,0,0,0.1)" } }}
      >
        <MenuItem onClick={handleConfirmSplit} sx={{ gap: 1.5, py: 1.2, px: 2 }}>
          <CallSplitIcon fontSize="small" sx={{ color: COLORS.dateBlue }} />
          <Typography variant="body2" fontWeight={600}>Split segment here</Typography>
        </MenuItem>
      </Menu>

      {ops.conflictPrompt && (
        <ConflictResolutionDialog
          prompt={ops.conflictPrompt}
          onKeepExisting={() => ops.resolveConflictPrompt("existing")}
          onKeepApi={() => ops.resolveConflictPrompt("api")}
        />
      )}

      {guardDialogProps && (
        <ActionGuardDialog {...guardDialogProps} onClose={closeGuardDialog} />
      )}
    </div>
  );
};

export default EditorContainer;
