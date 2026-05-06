import React from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CancelIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import { shadows } from "../../../shared/theme";
import PaletteRow from "./PaletteRow";
import { usePaletteConfig } from "./usePaletteConfig";

const outlinedButtonSx = {
  color: "text.primary",
  bgcolor: "background.paper",
  borderColor: "#CBD5E1",
  textTransform: "uppercase",
  fontWeight: 700,
  "&:hover": { bgcolor: "action.hover", borderColor: "text.secondary" },
} as const;

/**
 * Admin section that exposes the entity color palette as a runtime-editable configuration.
 * Mirrors the endpoints table pattern (read-mode + edit-mode, Edit/Save/Cancel) so admins navigate a familiar UX.
 *
 * After save the page reloads, so all consumers of `ENTITY_COLORS` (CodeMirror theme, segment chips, dialogs) rebind to the new palette.
 */
const PaletteEditor: React.FC = () => {
  const {
    palette,
    loading,
    ready,
    canEdit,
    editing,
    draft,
    saving,
    saveError,
    hasChanges,
    rowErrors,
    startEditing,
    cancelEditing,
    save,
    setDraftKey,
    setDraftColor,
    removeDraftEntry,
    addDraftEntry,
  } = usePaletteConfig();

  const rows = editing ? draft : palette.map((entry) => ({ ...entry }));

  return (
    <Box mt={4}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
        ml={{ xs: 0, sm: 3 }}
        gap={2}
      >
        <Typography
          variant="subtitle1"
          fontWeight={700}
          sx={{ color: "gold.main", textShadow: shadows.text }}
        >
          Entity Palette
        </Typography>
        <Box display="flex" gap={1}>
          {canEdit && !editing && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={startEditing}
              disabled={!ready}
              sx={outlinedButtonSx}
            >
              Edit
            </Button>
          )}
          {editing && (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CancelIcon />}
                onClick={cancelEditing}
                disabled={saving}
                sx={outlinedButtonSx}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                onClick={save}
                disabled={saving || !hasChanges || Object.keys(rowErrors).length > 0}
                sx={{ textTransform: "uppercase", fontWeight: 700 }}
              >
                Save
              </Button>
            </>
          )}
        </Box>
      </Box>

      {saveError && (
        <Typography variant="body2" sx={{ color: "error.main", ml: { xs: 0, sm: 3 }, mb: 2 }}>
          {saveError}
        </Typography>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={24} />
        </Box>
      )}

      {!loading && rows.length > 0 && (
        <TableContainer
          component={Paper}
          sx={{
            ml: { xs: 0, sm: 2 },
            borderRadius: 3,
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            backdropFilter: "blur(6px)",
            boxShadow: shadows.lg,
          }}
        >
          <Box sx={{ p: 2 }}>
            <Table>
              <TableHead
                sx={{
                  "& .MuiTableCell-head": {
                    bgcolor: "background.paper",
                    color: "text.primary",
                    fontWeight: 700,
                    borderBottom: 1,
                    borderColor: "divider",
                  },
                }}
              >
                <TableRow>
                  <TableCell sx={{ width: 56 }}>{""}</TableCell>
                  <TableCell>Entity</TableCell>
                  <TableCell>Color</TableCell>
                  <TableCell sx={{ width: 56 }} align="right">{""}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((entry, index) => (
                  <PaletteRow
                    key={editing ? `draft-${index}` : entry.key}
                    savedKey={palette[index]?.key ?? entry.key}
                    savedColor={palette[index]?.color}
                    draftKey={editing ? draft[index]?.key ?? "" : entry.key}
                    draftColor={editing ? draft[index]?.color ?? "" : entry.color}
                    editing={editing}
                    error={rowErrors[index]}
                    onKeyChange={(v) => setDraftKey(index, v)}
                    onColorChange={(v) => setDraftColor(index, v)}
                    onDelete={() => removeDraftEntry(index)}
                  />
                ))}
              </TableBody>
            </Table>

            {editing && (
              <Box mt={2}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addDraftEntry}
                  sx={outlinedButtonSx}
                >
                  Add entity
                </Button>
              </Box>
            )}
          </Box>
        </TableContainer>
      )}

      {!loading && rows.length === 0 && (
        <Typography variant="body2" sx={{ color: "text.secondary", ml: { xs: 0, sm: 3 } }}>
          No entities configured. {canEdit ? "Click Edit to add one." : ""}
        </Typography>
      )}
    </Box>
  );
};

export default PaletteEditor;
