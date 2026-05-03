import React from "react";
import {
  Box,
  Button,
  IconButton,
  TableCell,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditNoteIcon from "@mui/icons-material/EditNote";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import type { WorkspaceMetadata } from "../../../core/entities/Workspace";
import { sx as sxUtil } from "../../../shared/styles";

interface Props {
  workspace: WorkspaceMetadata;
  isEditing: boolean;
  draftName: string;
  isDuplicate: boolean;
  onOpen: (id: string) => void;
  onStartEdit: (ws: WorkspaceMetadata) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDraftChange: (value: string) => void;
  onExport: (ws: WorkspaceMetadata) => void;
  onDelete: (id: string, name: string) => void;
}

/** Single row in the Manage Workspaces table - read-mode + inline edit-mode in one element. */
const WorkspaceRow: React.FC<Props> = ({
  workspace: ws,
  isEditing,
  draftName,
  isDuplicate,
  onOpen,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDraftChange,
  onExport,
  onDelete,
}) => (
  <TableRow
    hover
    sx={{
      "&:hover": { backgroundColor: "action.hover" },
      "& .MuiTableCell-root": {
        borderBottom: 1,
        borderColor: "divider",
      },
    }}
  >
    <TableCell sx={{ width: "40%", color: "text.primary" }}>
      {isEditing ? (
        <Box sx={{ ...sxUtil.flexRow, gap: 1 }}>
          <TextField
            size="small"
            value={draftName}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSaveEdit();
              }
            }}
            autoFocus
            error={isDuplicate}
            helperText={isDuplicate ? "Another workspace already uses this name." : undefined}
          />
          <IconButton
            size="small"
            onClick={onSaveEdit}
            disabled={!draftName.trim() || isDuplicate}
            sx={{ color: "primary.main" }}
          >
            <CheckIcon />
          </IconButton>
          <IconButton size="small" onClick={onCancelEdit} sx={{ color: "text.secondary" }}>
            <CloseIcon />
          </IconButton>
        </Box>
      ) : (
        <Box sx={{ ...sxUtil.flexRow, gap: 1 }}>
          <Typography sx={{ color: "text.primary", fontWeight: 800 }}>{ws.name}</Typography>
          <IconButton
            size="small"
            onClick={() => onStartEdit(ws)}
            sx={{ color: "primary.main" }}
            aria-label="Rename"
          >
            <EditNoteIcon />
          </IconButton>
        </Box>
      )}
    </TableCell>

    <TableCell sx={{ color: "text.secondary" }}>{ws.id}</TableCell>

    <TableCell sx={{ width: "20%", color: "text.secondary" }}>
      {ws.updatedAt ? new Date(ws.updatedAt).toLocaleString() : "-"}
    </TableCell>

    <TableCell align="right">
      <Button
        variant="outlined"
        size="small"
        onClick={() => onOpen(ws.id)}
        sx={{
          mr: 1,
          color: "text.primary",
          borderColor: "#CBD5E1",
          textTransform: "uppercase",
          fontWeight: 700,
          "&:hover": { bgcolor: "background.paper", borderColor: "text.secondary" },
        }}
      >
        Open
      </Button>
      <IconButton
        size="small"
        onClick={() => onExport(ws)}
        sx={{ color: "primary.main", mr: 1 }}
        aria-label="Export"
        title="Export workspace"
      >
        <FileDownloadIcon />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => onDelete(ws.id, ws.name)}
        sx={{ color: "error.main" }}
        aria-label="Delete"
      >
        <DeleteOutlineIcon />
      </IconButton>
    </TableCell>
  </TableRow>
);

export default WorkspaceRow;
