import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Paper,
  IconButton,
} from "@mui/material";
import CancelIcon from "@mui/icons-material/Close";
import type { SchemaDialogState } from "./types";

/** Props: `dialog` is null when closed, populated when open. */
interface AdapterSchemaDialogProps {
  dialog: SchemaDialogState | null;
  onClose: () => void;
}

/** Read-only modal that pretty-prints an adapter's request/response schemas. */
const AdapterSchemaDialog: React.FC<AdapterSchemaDialogProps> = ({ dialog, onClose }) => {
  return (
    <Dialog open={!!dialog} onClose={onClose} maxWidth="sm" fullWidth>
      {dialog && (
        <>
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography fontWeight={700}>{dialog.name}</Typography>
            <IconButton size="small" onClick={onClose}>
              <CancelIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: "text.secondary" }}>
              Request
            </Typography>
            <Paper sx={{ p: 2, mb: 2, bgcolor: "#F8FAFC", fontFamily: "monospace", fontSize: "0.85rem", overflow: "auto" }}>
              <pre style={{ margin: 0 }}>{JSON.stringify(dialog.schema.request, null, 2)}</pre>
            </Paper>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: "text.secondary" }}>
              Response
            </Typography>
            <Paper sx={{ p: 2, bgcolor: "#F8FAFC", fontFamily: "monospace", fontSize: "0.85rem", overflow: "auto" }}>
              <pre style={{ margin: 0 }}>{JSON.stringify(dialog.schema.response, null, 2)}</pre>
            </Paper>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
};

export default AdapterSchemaDialog;
