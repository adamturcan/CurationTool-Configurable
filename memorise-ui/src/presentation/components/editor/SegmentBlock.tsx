import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";

import { CodeMirrorWrapper } from "./codemirror/CodeMirrorWrapper";
import { SegmentLogic } from "../../../core/entities/SegmentLogic";
import { SpanLogic } from "../../../core/entities/SpanLogic";
import { TranslationLogic } from "../../../core/entities/TranslationLogic";
import type { NerSpan, SelectionBox, SpanCoordMap, Segment, TranslationDTO } from "../../../types";
import { ENTITY_COLORS } from "../../../shared/constants/notationEditor";
import { useSegmentDrag } from "./context/SegmentDragContext";
import { useSegmentDragTarget } from "../../hooks/useSegmentDragTarget";
import { useSessionStore } from "../../stores";
import type { LanguageOption } from "../../hooks";
import SegmentBoundaryControls from "./SegmentBoundaryControls";
import SegmentHeader from "./SegmentHeader";
import { TranslateLanguageMenu } from "./menus";
import { ClearTranslationDialog, ReTranslateConfirmDialog } from "./dialogs";

// Prop groups

interface SegmentDisplayProps {
  isActive: boolean;
  isDragging: boolean;
  dropDisabled: boolean;
}

export interface SegmentHandlers {
  onActivate: (segmentId: string) => void;
  onJoinUp: (segmentId: string) => void;
  onRunNer: (segmentId: string, lang: string) => void;
  onRunSemTag: (segmentId: string, lang: string) => void;
  onSpanClick: (span: NerSpan, el: HTMLElement, fn: (newText: string) => void, lang: string, start: number) => void;
  onSelectionChange: (sel: SelectionBox | null, segmentId: string, lang: string, start: number) => void;
  onTextChange: (segmentId: string, text: string, coords: SpanCoordMap | undefined, deadIds?: string[], lang?: string) => void;
  onShiftBoundary?: (sourceSegmentId: string, globalTargetPos: number) => void;
  onInvalidDrop?: () => void;
}

export interface SegmentTranslationHandlers {
  onAddTranslation: (segmentId: string, lang: string) => void;
  onDeleteTranslation: (lang: string, segmentId: string) => void;
  onUpdateTranslation: (segmentId: string, lang: string) => void;
  languageOptions: LanguageOption[];
  isLanguageListLoading: boolean;
}

interface SegmentDragHandlers {
  prevSegmentId?: string;
}

// Component props

interface SegmentBlockProps {
  segment: Segment;
  index: number;
  display: SegmentDisplayProps;
  handlers: SegmentHandlers;
  translationHandlers: SegmentTranslationHandlers;
  dragHandlers: SegmentDragHandlers;
}

// Component

/** Renders a single text segment with CodeMirror editor, translation controls, and drag handles */
const SegmentBlockImpl: React.FC<SegmentBlockProps> = ({
  segment, index,
  display: { isActive, isDragging, dropDisabled },
  handlers: { onActivate, onJoinUp, onRunNer, onRunSemTag, onSpanClick, onSelectionChange, onTextChange, onShiftBoundary, onInvalidDrop },
  translationHandlers: { onAddTranslation, onDeleteTranslation, onUpdateTranslation, languageOptions, isLanguageListLoading },
  dragHandlers: { prevSegmentId },
}) => {
  const [localLang, setLocalLang] = useState("original");
  const translations = useSessionStore((s) => s.session?.translations);
  const allSegments = useSessionStore((s) => s.session?.segments);
  const deletedApiKeys = useSessionStore((s) => s.session?.deletedApiKeys);
  const apiSpans = useSessionStore((s) => s.session?.apiSpans);
  const userSpans = useSessionStore((s) => s.session?.userSpans);
  const isTagPanelOpen = useSessionStore((s) => s.isTagPanelOpen);

  const [translateMenuAnchor, setTranslateMenuAnchor] = useState<HTMLElement | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reTranslateConfirmOpen, setReTranslateConfirmOpen] = useState(false);
  const [isHeaderOpen, setIsHeaderOpen] = useState(false);
  const [showSemTagOptions, setShowSemTagOptions] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const { notifyDragStart, notifyDragEnd, setHoveredIdx, registerNode } = useSegmentDrag();

  useEffect(() => {
    const el = boxRef.current;
    registerNode(index, el);
    return () => registerNode(index, null);
  }, [index, registerNode]);

  const availableLangs = useMemo(
    () => TranslationLogic.getLanguagesWithSegmentTranslation(translations || [], segment.id),
    [translations, segment.id]
  );

  const isSegmentEdited = useMemo(
    () => TranslationLogic.isSegmentEdited(segment, translations || [], localLang),
    [localLang, segment, translations]
  );

  useEffect(() => {
    if (localLang !== "original" && !availableLangs.includes(localLang)) setLocalLang("original");
  }, [localLang, availableLangs]);

  useEffect(() => {
    if (isActive) {
      setIsHeaderOpen(true);
    } else {
      setIsHeaderOpen(false);
      setShowSemTagOptions(false);
    }
  }, [isActive]);

  /** Keep the sem-tag slide-out in sync with the global tag panel. */
  useEffect(() => {
    if (!isTagPanelOpen) setShowSemTagOptions(false);
  }, [isTagPanelOpen]);

  /** Recompute segment boundaries from translated text lengths. */
  const virtualSegment = useMemo(() => {
    if (localLang === "original") return segment;
    const tLayer = translations?.find((t: TranslationDTO) => t.language === localLang);
    return SegmentLogic.calculateVirtualBoundaries(allSegments || [], tLayer?.segmentTranslations || {}).find((b: Segment) => b.id === segment.id) || segment;
  }, [localLang, segment, translations, allSegments]);

  const localSpans = useMemo(() => {
    if (!isActive) return [];
    const layer = localLang === "original"
      ? { apiSpans, userSpans }
      : translations?.find((t: TranslationDTO) => t.language === localLang);
    return SpanLogic.getVisibleSpansForSegment(
      layer?.apiSpans,
      layer?.userSpans,
      deletedApiKeys,
      virtualSegment.start,
      virtualSegment.end,
    );
  }, [localLang, translations, deletedApiKeys, apiSpans, userSpans, virtualSegment, isActive]);

  const handleDelete = () => { onDeleteTranslation(localLang, segment.id); setLocalLang("original"); setDeleteDialogOpen(false); };

  const handleCmChange = useCallback((newText: string, liveCoords?: Map<string, { start: number; end: number }>, deadIds?: string[]) => {
    onTextChange(segment.id, newText, liveCoords, deadIds, localLang);
  }, [onTextChange, segment.id, localLang]);

  const handleCmSpanClick = useCallback((span: NerSpan, el: HTMLElement, fn: (newText: string) => void) => {
    onSpanClick(span, el, fn, localLang, virtualSegment.start);
  }, [onSpanClick, localLang, virtualSegment.start]);

  const handleCmSelectionChange = useCallback((sel: SelectionBox | null) => {
    onSelectionChange(sel, segment.id, localLang, virtualSegment.start);
  }, [onSelectionChange, segment.id, localLang, virtualSegment.start]);

  const { handlers: dragTargetHandlers, effectiveDropDisabled } = useSegmentDragTarget({
    dropDisabled,
    isDragging,
    isTranslationView: localLang !== "original",
    onInvalidDrop,
  });

  // Handles drag-to-reorder: converts local drop offset to global position for boundary shift
  const handleDropTextPosition = useCallback((localOffset: number, dataTransfer: DataTransfer) => {
    const sourceSegmentId = dataTransfer.getData("application/segment-id");
    if (!sourceSegmentId) return;
    if (localLang !== "original") {
      onInvalidDrop?.();
      return;
    }
    if (onShiftBoundary) {
      onShiftBoundary(sourceSegmentId, virtualSegment.start + localOffset);
    }
  }, [virtualSegment.start, onShiftBoundary, localLang, onInvalidDrop]);

  return (
    <Box
      ref={boxRef}
      onClick={() => onActivate(segment.id)}
      onMouseEnter={() => setHoveredIdx(index)}
      onMouseLeave={() => setHoveredIdx(null)}
      {...dragTargetHandlers}
      sx={{
        position: "relative",
        backgroundColor: effectiveDropDisabled
          ? "#fff5f5"
          : isActive ? "#ffffff" : "#f1f5f9",
        backgroundImage: effectiveDropDisabled
          ? `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 8px,
              ${alpha("#ef4444", 0.07)} 8px,
              ${alpha("#ef4444", 0.07)} 10px
            )`
          : "none",
        borderBottom: `2px dashed ${alpha(ENTITY_COLORS.DATE, 0.3)}`,
        display: "flex",
        flexDirection: "column",
        transition: isDragging ? "none" : "background-color 0.2s ease",
        cursor: isDragging && !effectiveDropDisabled ? "crosshair" : "auto",
        "& .boundary-btn-group": { opacity: 0 },
        "&[data-boundary-visible='1'] .boundary-btn-group": { opacity: 1 },
        "&[data-dragging='1'] .boundary-btn-group": { opacity: 0 },
        "&:last-child": { borderBottom: "none" }
      }}
    >

      {index > 0 && (
        <SegmentBoundaryControls
          segmentId={segment.id}
          prevSegmentId={prevSegmentId}
          index={index}
          onJoinUp={onJoinUp}
          onDragStart={notifyDragStart}
          onDragEnd={notifyDragEnd}
          setHoveredIdx={setHoveredIdx}
        />
      )}

      <SegmentHeader
        segment={segment}
        index={index}
        localLang={localLang}
        setLocalLang={setLocalLang}
        availableLangs={availableLangs}
        isHeaderOpen={isHeaderOpen}
        setIsHeaderOpen={setIsHeaderOpen}
        isSegmentEdited={isSegmentEdited}
        showSemTagOptions={showSemTagOptions}
        setShowSemTagOptions={setShowSemTagOptions}
        onActivate={onActivate}
        onTranslateMenuOpen={setTranslateMenuAnchor}
        onDeleteTranslationClick={() => setDeleteDialogOpen(true)}
        onUpdateTranslation={onUpdateTranslation}
        onReTranslateConfirmOpen={() => setReTranslateConfirmOpen(true)}
        onRunNer={onRunNer}
        onRunSemTag={onRunSemTag}
      />

      <Box sx={{
        padding: "0 20px 20px 20px",
        "& .cm-editor": { outline: "none", backgroundColor: "transparent !important" },
        "& .cm-scroller": { backgroundColor: "transparent !important" },
        "& .cm-activeLine": { backgroundColor: "transparent !important" },
        "& .cm-gutters": { backgroundColor: "transparent !important", border: "none" },
        "& .cm-placeholder": { color: "#94a3b8", fontStyle: "italic" },
        ...(isDragging && !effectiveDropDisabled ? {
          "& .cm-editor, & .cm-scroller, & .cm-content": { cursor: "crosshair !important" },
          "& .cm-dropCursor": {
            borderLeft: `3px solid ${ENTITY_COLORS.DATE} !important`,
            marginLeft: "-1px !important"
          }
        } : {})
      }}>
        <CodeMirrorWrapper
          value={virtualSegment.text}
          spans={localSpans}
          onChange={handleCmChange}
          onSpanClick={handleCmSpanClick}
          onSelectionChange={handleCmSelectionChange}
          placeholder={segment.id === "root" ? "Insert your document text here..." : undefined}
          onDropTextPosition={handleDropTextPosition}
        />
      </Box>

      <TranslateLanguageMenu
        anchorEl={translateMenuAnchor}
        onClose={() => setTranslateMenuAnchor(null)}
        onPick={(code) => {
          onAddTranslation(segment.id, code);
          setLocalLang(code);
          setTranslateMenuAnchor(null);
        }}
        availableLangs={availableLangs}
        languageOptions={languageOptions}
        isLoading={isLanguageListLoading}
      />

      <ClearTranslationDialog
        open={deleteDialogOpen}
        language={localLang}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
      />

      <ReTranslateConfirmDialog
        open={reTranslateConfirmOpen}
        language={localLang}
        onClose={() => setReTranslateConfirmOpen(false)}
        onConfirm={() => { onUpdateTranslation(segment.id, localLang); setReTranslateConfirmOpen(false); }}
      />
    </Box>
  );
};

export const SegmentBlock = React.memo(SegmentBlockImpl);
