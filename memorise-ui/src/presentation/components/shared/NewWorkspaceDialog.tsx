import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void | Promise<void>;
  defaultName?: string;
  existingNames?: string[];
}

/** Prompts the user for a workspace name before creating a new workspace */
const NewWorkspaceDialog: React.FC<Props> = ({ open, onClose, onCreate, defaultName = "", existingNames = [] }) => {
  const [name, setName] = useState(defaultName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setIsSubmitting(false);
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
      await onCreate(trimmed);
    } finally {
      setIsSubmitting(false);
    }
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
