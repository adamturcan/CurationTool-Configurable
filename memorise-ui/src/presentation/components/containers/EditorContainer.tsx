import React, { useEffect, useRef, useCallback, useMemo } from "react";
import { Box, Menu, MenuItem, Typography, CircularProgress } from "@mui/material";

import CallSplitIcon from "@mui/icons-material/CallSplit";

import { useSessionStore, useNotificationStore } from "../../stores";
import { useLanguageOptions, useLayerOperations, useEditorOperations, useSpanInteractions, useSegmentSplitMerge, useExportOperations, useDragAutoScroll, useClickOutsideDeactivation } from "../../hooks";
import { ConflictResolutionDialog, ActionGuardDialog } from "../editor/dialogs";
import { EditorGlobalMenu, CategoryMenu } from "../editor/menus";
import { SegmentBlock } from "../editor/SegmentBlock";
import type { SegmentHandlers, SegmentTranslationHandlers } from "../editor/SegmentBlock";
import { SegmentDragProvider } from "../editor/context/SegmentDragContext";
import { TranslationLogic } from "../../../core/entities/TranslationLogic";
import { ENTITY_COLORS } from "../../../shared/constants/notationEditor";
import { shadows } from "../../../shared/theme";
import { sx as sxUtil } from "../../../shared/styles";

const CLICK_OUTSIDE_EXCLUSIONS = [
  "button", "input", "textarea",
  "[role=tab]", "[role=menuitem]", "[role=dialog]", "[role=presentation]",
  "[role=combobox]", "[role=listbox]", "[role=option]",
  "[data-tag-panel]",
];

/** Orchestrates the editor view with segment blocks, menus, and conflict dialogs */
const EditorContainer: React.FC = () => {
  const notify = useNotificationStore.getState().enqueue;
  const session = useSessionStore((state) => state.session);
  const draftText = useSessionStore((state) => state.draftText);
  const activeSegmentId = useSessionStore((state) => state.activeSegmentId);
  const setActiveSegmentId = useSessionStore((state) => state.setActiveSegmentId);

  const setTagPanelOpen = useSessionStore((state) => state.setTagPanelOpen);
  const isTagPanelOpen = useSessionStore((state) => state.isTagPanelOpen);
  const setDragging = useSessionStore((state) => state.setDragging);

  const { languageOptions, isLanguageListLoading } = useLanguageOptions();

  const globalLanguageOptions = useMemo(() => {
    const fullyTranslated = TranslationLogic.getFullyTranslatedLanguages(
      session?.translations ?? [],
      session?.segments ?? []
    );
    return languageOptions.filter((o) => !fullyTranslated.has(o.code));
  }, [languageOptions, session?.translations, session?.segments]);

  const layers = useLayerOperations();
  const ops = useEditorOperations(layers);
  const splits = useSegmentSplitMerge();
  const spans = useSpanInteractions(layers, splits.setSplitAnchor, () => splits.setSplitAnchor(null));
  const { handleExport } = useExportOperations();

  const handlers = useMemo<SegmentHandlers>(() => ({
    onActivate: setActiveSegmentId,
    onJoinUp: splits.handleJoinUp,
    onRunNer: ops.handleRunSegmentNer,
    onRunSemTag: ops.handleRunSegmentSemTag,
    onSpanClick: spans.handleSpanClick,
    onSelectionChange: spans.handleSelectionChange,
    onTextChange: ops.handleTextChange,
    onShiftBoundary: splits.handleShiftBoundary,
    onInvalidDrop: () => notify({ message: "Cannot drop boundary here - target is above the source or showing a translation view.", tone: "warning" }),
  }), [
    setActiveSegmentId, notify,
    splits.handleJoinUp, splits.handleShiftBoundary,
    ops.handleRunSegmentNer, ops.handleRunSegmentSemTag, ops.handleTextChange,
    spans.handleSpanClick, spans.handleSelectionChange,
  ]);

  const translationHandlers = useMemo<SegmentTranslationHandlers>(() => ({
    onAddTranslation: ops.handleTranslateSegment,
    onDeleteTranslation: ops.handleDeleteSegmentTranslation,
    onUpdateTranslation: ops.handleUpdateSegmentTranslation,
    languageOptions,
    isLanguageListLoading,
  }), [
    ops.handleTranslateSegment, ops.handleDeleteSegmentTranslation, ops.handleUpdateSegmentTranslation,
    languageOptions, isLanguageListLoading,
  ]);

  const segmentListRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useDragAutoScroll(scrollContainerRef, "application/segment-id");

  useEffect(() => {
    const dragging = splits.draggingFromIndex !== null;
    setDragging(dragging);
    if (dragging) setTagPanelOpen(false);
  }, [splits.draggingFromIndex, setDragging, setTagPanelOpen]);

  const deactivate = useCallback(() => {
    setActiveSegmentId(undefined);
    const blur = () => {
      const el = document.activeElement;
      if (el instanceof HTMLElement && el.closest(".cm-editor")) el.blur();
    };
    blur();
    requestAnimationFrame(blur);
  }, [setActiveSegmentId]);

  useClickOutsideDeactivation(segmentListRef, deactivate, CLICK_OUTSIDE_EXCLUSIONS);

  return (
    <div style={{ height: "100%", width: "100%", ...sxUtil.flexColumn, boxSizing: "border-box", overflow: "hidden", backgroundColor: "transparent", position: "relative" }}>

      {ops.isProcessing && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 1400,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.5,
            bgcolor: "rgba(31, 44, 36, 0.65)",
            backdropFilter: "blur(2px)",
          }}
        >
          <CircularProgress size={28} sx={{ color: "gold.main" }} />
          <Typography variant="body2" fontWeight={600} sx={{ color: "gold.main", textShadow: shadows.text }}>
            {ops.processingState?.message ?? "Processing…"}
          </Typography>
          {ops.processingState?.total != null && (
            <Typography variant="caption" sx={{ color: "gold.main", opacity: 0.8 }}>
              {ops.processingState.current ?? 0} / {ops.processingState.total}
            </Typography>
          )}
        </Box>
      )}

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", pt: 2, pb: 1, zIndex: 50 }}>
        <EditorGlobalMenu
          onNer={ops.handleRunGlobalNer}
          onSegment={ops.handleRunGlobalSegment}
          onSemTag={ops.handleRunGlobalSemTag}
          onSave={ops.handleSave}
          onTranslateAll={ops.handleRunGlobalTranslate}
          onExport={(format) => { if (session?.id) void handleExport(session.id, format); }}
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
          languageOptions={globalLanguageOptions}
          isLanguageListLoading={isLanguageListLoading}
        />
      </Box>

      <Box ref={scrollContainerRef} sx={{ flexGrow: 1, overflowY: "auto", width: "100%", px: { xs: 2, md: 4 }, py: 2 }}>
        <Box ref={segmentListRef} sx={{ borderRadius: "8px", border: 1, borderColor: "divider", boxShadow: shadows.sm, overflow: "hidden", backgroundColor: "transparent" }}>
          {!session?.segments || session.segments.length === 0 ? (
            <SegmentDragProvider onDraggingChange={splits.setDraggingFromIndex} draggingFromIndex={splits.draggingFromIndex}>
              <SegmentBlock
                segment={{ id: "root", start: 0, end: draftText.length, text: draftText, order: 0 }}
                index={0}
                display={{ isActive: true, isDragging: false, dropDisabled: false }}
                handlers={handlers}
                translationHandlers={translationHandlers}
                dragHandlers={{}}
              />
            </SegmentDragProvider>
          ) : (
            <SegmentDragProvider onDraggingChange={splits.setDraggingFromIndex} draggingFromIndex={splits.draggingFromIndex}>
              {session.segments.map((segment, idx) => {
                const isDragging = splits.draggingFromIndex !== null;
                const dropDisabled = splits.draggingFromIndex !== null && idx <= splits.draggingFromIndex;
                return (
                  <SegmentBlock
                    key={segment.id}
                    segment={segment}
                    index={idx}
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
        anchorEl={spans.menuAnchor} open={Boolean(spans.menuAnchor)} onClose={spans.closeEditMenu}
        onCategorySelect={spans.handleCategorySelect}
        showDelete={true}
        onDelete={spans.handleDeleteSpan}
        spanText={spans.spanText}
        onTextUpdate={spans.handleUpdateSpanText}
      />

      <CategoryMenu anchorEl={spans.virtualElement} open={Boolean(spans.virtualElement)} onClose={() => spans.setNewSelection(null)} onCategorySelect={spans.handleCreateSpan} showDelete={false} />

      <Menu
        open={Boolean(splits.splitAnchor)}
        anchorReference="anchorPosition"
        anchorPosition={splits.splitAnchor ? { top: splits.splitAnchor.top, left: splits.splitAnchor.left } : undefined}
        onClose={() => splits.setSplitAnchor(null)}
        PaperProps={{ sx: { borderRadius: 2, mt: 1, boxShadow: shadows.md } }}
      >
        <MenuItem onClick={splits.handleConfirmSplit} sx={{ gap: 1.5, py: 1.2, px: 2 }}>
          <CallSplitIcon fontSize="small" sx={{ color: ENTITY_COLORS.DATE }} />
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

      {splits.guardDialogProps && (
        <ActionGuardDialog {...splits.guardDialogProps} onClose={splits.closeGuardDialog} />
      )}
    </div>
  );
};

export default EditorContainer;
