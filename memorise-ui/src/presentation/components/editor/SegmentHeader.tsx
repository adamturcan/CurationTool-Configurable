import React from "react";
import { Box, Collapse, FormControl, IconButton, MenuItem, Select, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import TranslateIcon from "@mui/icons-material/Translate";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import LabelOutlinedIcon from "@mui/icons-material/LabelOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SyncIcon from "@mui/icons-material/Sync";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";

import { ENTITY_COLORS } from "../../../shared/constants/notationEditor";
import { sx as sxUtil } from "../../../shared/styles";
import { useSessionStore } from "../../stores";
import type { Segment } from "../../../types";

interface Props {
  segment: Segment;
  index: number;
  localLang: string;
  setLocalLang: (lang: string) => void;
  availableLangs: string[];
  isHeaderOpen: boolean;
  setIsHeaderOpen: (open: boolean) => void;
  isSegmentEdited: boolean;
  showSemTagOptions: boolean;
  setShowSemTagOptions: (open: boolean) => void;
  onActivate: (segmentId: string) => void;
  onTranslateMenuOpen: (anchor: HTMLElement) => void;
  onDeleteTranslationClick: () => void;
  onUpdateTranslation: (segmentId: string, lang: string) => void;
  onReTranslateConfirmOpen: () => void;
  onRunNer: (segmentId: string, lang: string) => void;
  onRunSemTag: (segmentId: string, lang: string) => void;
}

/**
 * Header strip on top of a segment block: language tab, expand/collapse, edit indicator, translate / re-translate / clear / NER / Sem-Tag buttons.
 * The Sem-Tag slide-out and the "Edited" pill are part of this component; the global tag-panel sync is handled by the parent.
 */
const SegmentHeader: React.FC<Props> = ({
  segment,
  index,
  localLang,
  setLocalLang,
  availableLangs,
  isHeaderOpen,
  setIsHeaderOpen,
  isSegmentEdited,
  showSemTagOptions,
  setShowSemTagOptions,
  onActivate,
  onTranslateMenuOpen,
  onDeleteTranslationClick,
  onUpdateTranslation,
  onReTranslateConfirmOpen,
  onRunNer,
  onRunSemTag,
}) => (
  <Box sx={{
    position: "relative",
    backgroundColor: isHeaderOpen ? "#f8fafc" : "transparent",
    borderBottom: (t) => isHeaderOpen ? `1px solid ${t.palette.divider}` : "none",
    transition: "background-color 0.2s ease",
  }}>
    <Box sx={{ position: "absolute", top: isHeaderOpen ? "8px" : "4px", right: "8px", zIndex: 10, ...sxUtil.flexRow, gap: 0.5 }}>
      {isSegmentEdited && !isHeaderOpen && (
        <Tooltip title="Segment manually edited">
          <Box sx={{
            ...sxUtil.flexRow, gap: 0.5,
            bgcolor: alpha("#f59e0b", 0.12), color: "#b45309",
            borderRadius: "12px", px: 1, py: 0.25,
            fontSize: "11px", fontWeight: 600, lineHeight: 1,
          }}>
            <EditOutlinedIcon sx={{ fontSize: "13px" }} />
            Edited
          </Box>
        </Tooltip>
      )}
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); onActivate(segment.id); setIsHeaderOpen(!isHeaderOpen); }}
        sx={{ color: "#94a3b8", width: 28, height: 28 }}
      >
        {isHeaderOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </IconButton>
    </Box>

    {!isHeaderOpen && <Box sx={{ height: "32px", width: "100%" }} />}

    <Collapse in={isHeaderOpen}>
      <Box sx={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 48px 8px 16px" }}>
        <Box sx={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", fontSize: 12, color: "#64748b", fontWeight: 500 }}>
          segment-{index + 1}
        </Box>
        <Box sx={{ ...sxUtil.flexRow, gap: 1.5 }}>
          <TranslateIcon sx={{ color: "#94a3b8", fontSize: "18px" }} />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={localLang}
              onChange={(e) => setLocalLang(e.target.value)}
              sx={{ backgroundColor: "transparent", fontWeight: 600, fontSize: "12px", height: "28px", "& fieldset": { border: "none" } }}
            >
              <MenuItem value="original">Original Text</MenuItem>
              {availableLangs.map((lang) => (
                <MenuItem key={lang} value={lang}>Translation: {lang.toUpperCase()}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title="Translate segment">
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onTranslateMenuOpen(e.currentTarget); }}
              sx={{ bgcolor: "gold.main", color: "secondary.main", width: "28px", height: "28px", borderRadius: "6px" }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {localLang !== "original" && (
            <Tooltip title={isSegmentEdited ? "Re-translate from original (will overwrite your edits)" : "Re-translate this segment from the original text"}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSegmentEdited) {
                    onReTranslateConfirmOpen();
                  } else {
                    onUpdateTranslation(segment.id, localLang);
                  }
                }}
                sx={{ bgcolor: alpha(ENTITY_COLORS.DATE, 0.1), color: ENTITY_COLORS.DATE, borderRadius: "6px", width: "28px", height: "28px" }}
              >
                <SyncIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {localLang !== "original" && (
            <Tooltip title="Clear Translation">
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onDeleteTranslationClick(); }}
                sx={{ bgcolor: (t) => alpha(t.palette.error.main, 0.1), color: "error.main", width: "28px", height: "28px", borderRadius: "6px" }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ ...sxUtil.flexRow, gap: 1 }}>
          {isSegmentEdited && (
            <Tooltip title="Segment manually edited">
              <Box sx={{
                ...sxUtil.flexRow, gap: 0.5,
                bgcolor: alpha("#f59e0b", 0.12), color: "#b45309",
                border: `1px solid ${alpha("#f59e0b", 0.3)}`,
                borderRadius: "12px", px: 1, py: 0.25,
                fontSize: "11px", fontWeight: 600, lineHeight: 1,
                mr: 0.5,
              }}>
                <EditOutlinedIcon sx={{ fontSize: "13px" }} />
                Edited
              </Box>
            </Tooltip>
          )}
          <Tooltip title="Run NER on segment">
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onRunNer(segment.id, localLang); }}
              sx={{ bgcolor: alpha(ENTITY_COLORS.PER, 0.1), color: ENTITY_COLORS.PER, borderRadius: "6px", width: "28px", height: "28px" }}
            >
              <ManageSearchIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={showSemTagOptions ? "Close Sem-Tag options" : "Semantic Tags"}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                const willOpen = !showSemTagOptions;
                setShowSemTagOptions(willOpen);
                if (willOpen) {
                  onActivate(segment.id);
                  useSessionStore.getState().setTagPanelOpen(true);
                } else {
                  useSessionStore.getState().setTagPanelOpen(false);
                }
              }}
              sx={{
                bgcolor: showSemTagOptions ? alpha(ENTITY_COLORS.PER, 0.2) : alpha(ENTITY_COLORS.PER, 0.1),
                color: ENTITY_COLORS.PER,
                borderRadius: "6px",
                width: "28px",
                height: "28px",
              }}
            >
              <LabelOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Collapse in={showSemTagOptions} orientation="horizontal" unmountOnExit>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box sx={{ width: "1px", height: "20px", bgcolor: "divider", mx: 0.75 }} />
              <Tooltip title="Run Sem-Tag on segment">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRunSemTag(segment.id, localLang);
                    setShowSemTagOptions(false);
                  }}
                  sx={{
                    bgcolor: alpha(ENTITY_COLORS.PER, 0.1),
                    color: ENTITY_COLORS.PER,
                    borderRadius: "6px",
                    width: "28px",
                    height: "28px",
                  }}
                >
                  <AutoFixHighIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Collapse>
        </Box>
      </Box>
    </Collapse>
  </Box>
);

export default SegmentHeader;
