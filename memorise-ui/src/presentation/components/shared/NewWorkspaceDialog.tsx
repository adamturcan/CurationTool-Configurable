import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, text?: string) => void | Promise<void>;
  defaultName?: string;
  existingNames?: string[];
}

const MAX_FILE_BYTES = 1_000_000;
const ACCEPTED_TYPES = ".txt,.md,text/plain,text/markdown";

/** Prompts the user for a workspace name (and optional text file) before creating a new workspace */
const NewWorkspaceDialog: React.FC<Props> = ({ open, onClose, onCreate, defaultName = "", existingNames = [] }) => {
  const [name, setName] = useState(defaultName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setIsSubmitting(false);
      setFileName(null);
      setFileText(null);
      setFileError(null);
    }
  }, [open, defaultName]);

  const trimmed = name.trim();

  const isDuplicate = useMemo(() => {
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    return existingNames.some(n => n.trim().toLowerCase() === lower);
  }, [trimmed, existingNames]);

  const canSubmit = trimmed.length > 0 && !isSubmitting && !isDuplicate;

  const handleSubmit = async () => {
    if (!open) return;
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await onCreate(trimmed, fileText ?? undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError(`File too large (${(file.size / 1024).toFixed(0)} KB). Limit is ${MAX_FILE_BYTES / 1000} KB.`);
      setFileName(null);
      setFileText(null);
      return;
    }
    try {
      const text = await file.text();
      setFileName(file.name);
      setFileText(text);
      setFileError(null);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to read file");
      setFileName(null);
      setFileText(null);
    }
  };

  const handleClearFile = () => {
    setFileName(null);
    setFileText(null);
    setFileError(null);
  };

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => { if (reason !== "backdropClick" || !isSubmitting) onClose(); }}
      maxWidth="xs"
      fullWidth
      disableEscapeKeyDown={isSubmitting}
    >
      <DialogTitle>New Workspace</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label="Workspace name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit) {
              e.preventDefault();
              void handleSubmit();
            }
          }}
          disabled={isSubmitting}
          error={isDuplicate}
          helperText={isDuplicate ? "You already have a workspace with this name. Pick a different one." : " "}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        {!fileName ? (
          <Button
            startIcon={<UploadFileIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting}
            size="small"
            sx={{ mt: 0.5, alignSelf: "flex-start", textTransform: "none" }}
          >
            Upload text file (optional)
          </Button>
        ) : (
          <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {fileName} ({(fileText?.length ?? 0).toLocaleString()} chars)
            </Typography>
            <IconButton size="small" onClick={handleClearFile} disabled={isSubmitting} aria-label="Remove file">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
        {fileError && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
            {fileError}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          variant="contained"
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewWorkspaceDialog;
