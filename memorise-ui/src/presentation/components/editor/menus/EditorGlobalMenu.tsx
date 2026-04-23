import React, { useState, useEffect } from "react";
import {
  Box, IconButton, Tooltip, Collapse, Autocomplete, TextField, ClickAwayListener
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import LabelOutlinedIcon from "@mui/icons-material/LabelOutlined";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import TranslateIcon from "@mui/icons-material/Translate";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import CodeIcon from "@mui/icons-material/Code";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

import type { LanguageOption } from "../../../hooks";
import { ENTITY_COLORS } from "../../../../shared/constants/notationEditor";
import { shadows } from "../../../../shared/theme";
import { sx as sxUtil } from "../../../../shared/styles";
import { useStore } from "zustand";
import { useSessionStore } from "../../../stores";

interface EditorGlobalMenuProps {
  onNer: () => void;
  onSegment: () => void;
  onSemTag: () => void;
  onSave: () => void;
  onTranslateAll: (langCode: string) => void;
  onExport: (format: "json" | "pdf") => void;
  isTagPanelOpen: boolean;
  onToggleTagPanel: (isOpen: boolean) => void;
  hasSegments?: boolean;
  isAlreadySegmented?: boolean;
  hasActiveSegment?: boolean;
  languageOptions: LanguageOption[];
  isLanguageListLoading: boolean;
}

const tooltipProps = {
  tooltip: {
    sx: {
      bgcolor: alpha("#FFFFFF", 0.95),
      color: "secondary.main",
      border: `1px solid ${alpha("#21426C", 0.16)}`,
      boxShadow: shadows.md,
      borderRadius: "8px",
      padding: "6px 12px",
      fontSize: 13,
      fontWeight: 600,
      mt: 1,
    }
  }
};

/** Renders the floating toolbar with save, NER, segmentation, translation, and tagging actions */
const EditorGlobalMenu: React.FC<EditorGlobalMenuProps> = ({
  onNer,
  onSegment,
  onSemTag,
  onSave,
  onTranslateAll,
  onExport,
  isTagPanelOpen,
  onToggleTagPanel,
  isAlreadySegmented = false,
  hasActiveSegment = false,
  languageOptions,
  isLanguageListLoading
}) => {
  const [showTranslate, setShowTranslate] = useState(false);
  const [showTagOptions, setShowTagOptions] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const isDirty = useSessionStore((s) => s.isDirty);
  const canUndo = useStore(useSessionStore.temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStore(useSessionStore.temporal, (s) => s.futureStates.length > 0);

  useEffect(() => {
    if (!isTagPanelOpen) {
      setShowTagOptions(false);
    }
  }, [isTagPanelOpen]);

  useEffect(() => {
    if (hasActiveSegment) {
      setShowTagOptions(false);
    }
  }, [hasActiveSegment]);

  const actions = [
    isDirty
      ? { key: "save", icon: <SaveOutlinedIcon fontSize="small" />, name: "Save Workspace", onClick: () => onSave(), accent: ENTITY_COLORS.LOC }
      : { key: "save", icon: <CheckCircleOutlineIcon fontSize="small" />, name: "All changes saved", onClick: () => { /* no-op when clean */ }, accent: ENTITY_COLORS.LOC },
    {
      key: "undo", icon: <UndoIcon fontSize="small" />, name: "Undo", accent: ENTITY_COLORS.MISC, disabled: !canUndo,
      // Mark dirty first so autosave picks up the restored state.
      onClick: () => {
        useSessionStore.setState({ isDirty: true });
        useSessionStore.temporal.getState().undo();
      },
    },
    {
      key: "redo", icon: <RedoIcon fontSize="small" />, name: "Redo", accent: ENTITY_COLORS.MISC, disabled: !canRedo,
      onClick: () => {
        useSessionStore.setState({ isDirty: true });
        useSessionStore.temporal.getState().redo();
      },
    },
    { key: "segment", icon: <CallSplitIcon fontSize="small" />, name: isAlreadySegmented ? "Document already segmented" : "Auto-Segment", onClick: () => onSegment(), accent: ENTITY_COLORS.DATE, disabled: isAlreadySegmented },
    { key: "ner", icon: <ManageSearchIcon fontSize="small" />, name: "Run NER", onClick: () => onNer(), accent: ENTITY_COLORS.PER },
    { key: "translate", icon: <TranslateIcon fontSize="small" />, name: "Translate Document", onClick: () => { setShowTranslate(!showTranslate); setShowExport(false); onToggleTagPanel(false); }, accent: ENTITY_COLORS.ORG },
    {
      key: "semtag",
      icon: <LabelOutlinedIcon fontSize="small" />,
      name: !isTagPanelOpen ? "Semantic Tags" : hasActiveSegment ? "Switch to Document Tags" : "Close Tag Panel",
      onClick: () => {
        const isSwitchingToGlobal = isTagPanelOpen && hasActiveSegment;
        const willOpen = !isTagPanelOpen || isSwitchingToGlobal;

        onToggleTagPanel(willOpen);
        setShowTagOptions(willOpen);
        setShowTranslate(false);
        setShowExport(false);
      },
      accent: ENTITY_COLORS.PER
    },
    {
      key: "export",
      icon: <FileDownloadIcon fontSize="small" />,
      name: "Export Workspace",
      onClick: () => {
        setShowExport(!showExport);
        setShowTranslate(false);
        setShowTagOptions(false);
        onToggleTagPanel(false);
      },
      accent: ENTITY_COLORS.CAMP,
    },
  ];

  return (
    <ClickAwayListener onClickAway={() => { setShowTranslate(false); setShowExport(false); }}>
      <Box sx={{
        display: "flex",
        alignItems: "center",
        bgcolor: "background.paper",
        borderRadius: "30px",
        padding: "4px 16px",
        boxShadow: shadows.md,
        border: 1, borderColor: "divider",
        transition: "all 0.3s ease"
      }}>

        <Box sx={{ ...sxUtil.flexRow, gap: 1 }}>
          {actions.map((action) => (
            <Box key={action.key} sx={{ display: "flex", alignItems: "center" }}>

              <Tooltip title={action.name} placement="bottom" componentsProps={tooltipProps}>
                <span>
                  <IconButton
                    disabled={!!action.disabled}
                    onClick={action.onClick}
                    sx={{
                      width: 42,
                      height: 42,
                      color: action.accent,
                      bgcolor: (action.key === "translate" && showTranslate) || (action.key === "semtag" && showTagOptions) || (action.key === "export" && showExport) ? alpha(action.accent, 0.1) : "transparent",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        bgcolor: alpha(action.accent, 0.1),
                        transform: "scale(1.1)",
                      },
                      "&.Mui-disabled": { opacity: 0.5 }
                    }}
                  >
                    {action.icon}
                  </IconButton>
                </span>
              </Tooltip>

              {/* Translation Slide-Out */}
              {action.key === "translate" && (
                <Collapse in={showTranslate} orientation="horizontal" unmountOnExit>
                  <Box sx={{ display: "flex", alignItems: "center", width: "max-content" }}>
                    <Box sx={{ width: "1px", height: "24px", bgcolor: "divider", mx: 1 }} />
                    <Box sx={{ width: 180, pr: 1, display: "flex", alignItems: "center" }}>
                      <Autocomplete
                        fullWidth size="small" disableClearable forcePopupIcon={false}
                        options={languageOptions || []}
                        getOptionLabel={(option: LanguageOption) => option.label}
                        loading={isLanguageListLoading}
                        noOptionsText="All segments are fully translated"
                        onChange={(_event, newValue: LanguageOption) => {
                          if (newValue) { onTranslateAll(newValue.code); setShowTranslate(false); }
                        }}
                        slotProps={{ paper: { sx: { mt: 1, borderRadius: "8px", boxShadow: shadows.md, border: 1, borderColor: "divider" } } }}
                        renderOption={(props, option: LanguageOption) => (
                          <li {...props} key={option.code}>
                            <Box sx={{ ...sxUtil.flexColumn, py: 0.5 }}>
                              <span style={{ textTransform: "uppercase", fontWeight: 700, color: '#1e293b' }}>{option.code}</span>
                              <span style={{ fontSize: "0.8rem", color: '#64748b' }}>{option.label}</span>
                            </Box>
                          </li>
                        )}
                        renderInput={(params) => (
                          <TextField
                            {...params} autoFocus placeholder="Translate to..." variant="standard"
                            InputProps={{ ...params.InputProps, disableUnderline: true, sx: { fontSize: "14px", color: '#64748b', fontWeight: 500 } }}
                          />
                        )}
                      />
                    </Box>
                    <Box sx={{ width: "1px", height: "24px", bgcolor: "divider", mx: 1 }} />
                  </Box>
                </Collapse>
              )}

              {/* Export Slide-Out */}
              {action.key === "export" && (
                <Collapse in={showExport} orientation="horizontal" unmountOnExit>
                  <Box sx={{ display: "flex", alignItems: "center", width: "max-content" }}>
                    <Box sx={{ width: "1px", height: "24px", bgcolor: "divider", mx: 1 }} />
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, pr: 0.5 }}>
                      <Tooltip title="Export as JSON" placement="bottom" componentsProps={tooltipProps}>
                        <span>
                          <IconButton
                            onClick={() => { onExport("json"); setShowExport(false); }}
                            sx={{
                              width: 42, height: 42,
                              color: ENTITY_COLORS.CAMP,
                              bgcolor: alpha(ENTITY_COLORS.CAMP, 0.08),
                              transition: "all 0.2s ease",
                              "&:hover": { bgcolor: alpha(ENTITY_COLORS.CAMP, 0.15), transform: "scale(1.1)" }
                            }}
                          >
                            <CodeIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Export as PDF" placement="bottom" componentsProps={tooltipProps}>
                        <span>
                          <IconButton
                            onClick={() => { onExport("pdf"); setShowExport(false); }}
                            sx={{
                              width: 42, height: 42,
                              color: ENTITY_COLORS.CAMP,
                              bgcolor: alpha(ENTITY_COLORS.CAMP, 0.08),
                              transition: "all 0.2s ease",
                              "&:hover": { bgcolor: alpha(ENTITY_COLORS.CAMP, 0.15), transform: "scale(1.1)" }
                            }}
                          >
                            <PictureAsPdfIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </Box>
                </Collapse>
              )}

              {/* Semantic Tags Slide-Out */}
              {action.key === "semtag" && (
                <Collapse in={showTagOptions} orientation="horizontal" unmountOnExit>
                  <Box sx={{ display: "flex", alignItems: "center", width: "max-content" }}>
                    <Box sx={{ width: "1px", height: "24px", bgcolor: "divider", mx: 1 }} />
                    <Box sx={{ display: "flex", alignItems: "center", pr: 0.5 }}>

                      <Tooltip title="Auto-Tag Document" placement="bottom" componentsProps={tooltipProps}>
                        <span>
                          <IconButton
                            onClick={() => onSemTag()}
                            sx={{
                              width: 42,
                              height: 42,
                              color: ENTITY_COLORS.PER,
                              bgcolor: alpha(ENTITY_COLORS.PER, 0.08),
                              transition: "all 0.2s ease",
                              "&:hover": { bgcolor: alpha(ENTITY_COLORS.PER, 0.15), transform: "scale(1.1)" }
                            }}
                          >
                            <AutoFixHighIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                    </Box>
                  </Box>
                </Collapse>
              )}

            </Box>
          ))}
        </Box>
      </Box>
    </ClickAwayListener>
  );
};

export default EditorGlobalMenu;