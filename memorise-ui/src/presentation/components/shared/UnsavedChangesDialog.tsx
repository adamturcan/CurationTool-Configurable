import React, { useState } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useSessionStore, useWorkspaceStore, useNotificationStore } from "../../stores";
import { editorWorkflowService } from "../../../application/workflows/EditorWorkflowService";

/** Dialog shown when navigating away from an unsaved workspace */
const UnsavedChangesDialog: React.FC = () => {
  const pendingAction = useNotificationStore((s) => s.unsavedGuardAction);
  const dismiss = useNotificationStore((s) => s.dismissUnsavedGuard);
  const proceed = useNotificationStore((s) => s.proceedUnsavedGuard);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAndLeave = async () => {
    const { session, draftText } = useSessionStore.getState();
    if (!session) { proceed(); return; }

    setIsSaving(true);
    try {
      const result = await editorWorkflowService.saveWorkspace(session, draftText);
      if (result.ok) {
        if (result.sessionPatch) useSessionStore.getState().updateSession(result.sessionPatch);
        if (result.workspaceMetadataPatch) useWorkspaceStore.getState().updateWorkspaceMetadata(session.id, result.workspaceMetadataPatch);
      } else {
        useNotificationStore.getState().enqueue(result.notice);
        setIsSaving(false);
        return;
      }
    } catch {
      useNotificationStore.getState().enqueue({ message: "Failed to save. Please try again.", tone: "error" });
      setIsSaving(false);
      return;
    }
    setIsSaving(false);
    proceed();
  };

  return (
    <Dialog
      open={pendingAction !== null}
      onClose={(_, reason) => { if (reason !== "backdropClick" || !isSaving) dismiss(); }}
      maxWidth="xs"
      fullWidth
      disableEscapeKeyDown={isSaving}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, color: "warning.main" }}>
        <WarningAmberIcon />
        Unsaved Changes
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          You have unsaved changes in this workspace. What would you like to do?
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={dismiss} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={proceed} disabled={isSaving} color="error">
          Leave without saving
        </Button>
        <Button
          onClick={handleSaveAndLeave}
          disabled={isSaving}
          variant="contained"
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSaving ? "Saving..." : "Save & Leave"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UnsavedChangesDialog;
