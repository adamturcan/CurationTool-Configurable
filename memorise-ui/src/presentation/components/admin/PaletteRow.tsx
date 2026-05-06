import React from "react";
import {
  Box,
  IconButton,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

/** Props: edits flow up; rendering is fully controlled by the parent hook. */
interface PaletteRowProps {
  /** Saved entity key, or empty for a freshly added row. */
  savedKey: string;
  /** Saved hex color, or undefined for a freshly added row. */
  savedColor: string | undefined;
  /** Working draft key (edit mode only). */
  draftKey: string;
  /** Working draft color (edit mode only). */
  draftColor: string;
  /** True when the row should render inputs instead of read-only cells. */
  editing: boolean;
  /** Validation message for this row, if any. */
  error: string | undefined;
  /** Called when the user types in the key field. */
  onKeyChange: (value: string) => void;
  /** Called when the user picks a new color. */
  onColorChange: (value: string) => void;
  /** Called when the user clicks the delete button. */
  onDelete: () => void;
}

/** Stateless palette row: read-mode swatch + label or edit-mode inputs. */
const PaletteRow: React.FC<PaletteRowProps> = ({
  savedKey,
  savedColor,
  draftKey,
  draftColor,
  editing,
  error,
  onKeyChange,
  onColorChange,
  onDelete,
}) => {
  return (
    <TableRow
      sx={{
        "&:hover": { backgroundColor: "action.hover" },
        "& .MuiTableCell-root": {
          borderBottom: 1,
          borderColor: "divider",
        },
      }}
    >
      <TableCell sx={{ width: 56 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: "6px",
            bgcolor: editing ? draftColor : (savedColor ?? "#E5E7EB"),
            border: 1,
            borderColor: "divider",
          }}
        />
      </TableCell>
      <TableCell>
        {editing ? (
          <TextField
            value={draftKey}
            onChange={(e) => onKeyChange(e.target.value.toUpperCase())}
            size="small"
            fullWidth
            variant="outlined"
            placeholder="ENTITY_KEY"
            inputProps={{ maxLength: 50, style: { fontFamily: "monospace" } }}
            error={Boolean(error)}
            helperText={error}
          />
        ) : (
          <Typography fontFamily="monospace" fontWeight={700} sx={{ color: "text.primary" }}>
            {savedKey}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <Box display="flex" alignItems="center" gap={1}>
            <Box
              component="input"
              type="color"
              value={draftColor.match(/^#[0-9A-Fa-f]{6}$/) ? draftColor : "#94A3B8"}
              onChange={(e) => onColorChange((e.target as HTMLInputElement).value.toUpperCase())}
              sx={{
                width: 36,
                height: 36,
                border: 1,
                borderColor: "divider",
                borderRadius: "6px",
                cursor: "pointer",
                p: 0,
                background: "transparent",
              }}
            />
            <TextField
              value={draftColor}
              onChange={(e) => onColorChange(e.target.value)}
              size="small"
              variant="outlined"
              inputProps={{ maxLength: 7, style: { fontFamily: "monospace" } }}
              sx={{ width: 110 }}
            />
          </Box>
        ) : (
          <Typography variant="body2" fontFamily="monospace" sx={{ color: "text.secondary" }}>
            {savedColor ?? "—"}
          </Typography>
        )}
      </TableCell>
      <TableCell align="right" sx={{ width: 56 }}>
        {editing && (
          <Tooltip title="Remove entity">
            <IconButton size="small" onClick={onDelete} aria-label="delete entity">
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  );
};

export default PaletteRow;
