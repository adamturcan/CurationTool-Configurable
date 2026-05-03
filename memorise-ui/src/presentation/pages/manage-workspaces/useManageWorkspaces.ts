import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { WorkspaceMetadata } from "../../../core/entities/Workspace";
import { WorkspaceLogic } from "../../../core/entities/WorkspaceLogic";
import { useWorkspaceStore, useNotificationStore } from "../../stores";
import { useExportOperations } from "../../hooks";
import { getWorkspaceApplicationService } from "../../../infrastructure/providers/workspaceProvider";
import { isAppError, toAppError } from "../../../shared/errors";
import { presentAppError } from "../../../application/errors";

interface DeleteTarget {
  id: string;
  name: string;
}

/**
 * Bundles all state and side-effects for the Manage Workspaces page: list, inline rename, delete confirmation, and export-format dialog.
 * Errors from the backing service are surfaced as notifications with a `retryAction`, matching the rest of the app.
 */
export function useManageWorkspaces() {
  const navigate = useNavigate();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const notify = useNotificationStore.getState().enqueue;
  const { handleExport } = useExportOperations();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportTarget, setExportTarget] = useState<WorkspaceMetadata | null>(null);

  const reportError = useCallback((err: unknown, retryAction?: () => void) => {
    const appError = isAppError(err) ? err : toAppError(err);
    notify({ ...presentAppError(appError), retryAction });
  }, [notify]);

  const open = useCallback((id: string) => {
    navigate(`/workspace/${id}`);
  }, [navigate]);

  const isRenameDuplicate = useCallback(
    (id: string, candidate: string) => WorkspaceLogic.isRenameDuplicate(workspaces, id, candidate),
    [workspaces]
  );

  const startEdit = useCallback((ws: WorkspaceMetadata) => {
    setEditingId(ws.id);
    setDraftName(ws.name);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setDraftName("");
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    const name = draftName.trim();
    if (!name) return;
    if (isRenameDuplicate(editingId, name)) return;
    const id = editingId;
    try {
      const service = getWorkspaceApplicationService();
      await service.updateWorkspace({ workspaceId: id, patch: { name } });
      useWorkspaceStore.getState().updateWorkspaceMetadata(id, { name });
      setEditingId(null);
      setDraftName("");
    } catch (err) {
      reportError(err, () => { void saveEdit(); });
    }
  }, [editingId, draftName, isRenameDuplicate, reportError]);

  const openDelete = useCallback((id: string, name: string) => {
    setDeleteTarget({ id, name });
    setDeleteOpen(true);
  }, []);

  const closeDelete = useCallback(() => {
    setDeleteOpen(false);
    setDeleteTarget(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    try {
      const service = getWorkspaceApplicationService();
      await service.deleteWorkspace(id);
      useWorkspaceStore.getState().removeWorkspaceMetadata(id);
      closeDelete();
    } catch (err) {
      reportError(err, () => { void confirmDelete(); });
    }
  }, [deleteTarget, closeDelete, reportError]);

  const openExport = useCallback((ws: WorkspaceMetadata) => {
    setExportTarget(ws);
    setExportOpen(true);
  }, []);

  const closeExport = useCallback(() => {
    setExportOpen(false);
    setExportTarget(null);
  }, []);

  const exportAs = useCallback(async (type: "json" | "pdf") => {
    if (!exportTarget) return;
    await handleExport(exportTarget.id, type);
    closeExport();
  }, [exportTarget, handleExport, closeExport]);

  return {
    workspaces,
    open,
    rename: {
      editingId,
      draftName,
      setDraftName,
      isRenameDuplicate,
      startEdit,
      cancelEdit,
      saveEdit,
    },
    deletion: {
      open: deleteOpen,
      target: deleteTarget,
      openDelete,
      closeDelete,
      confirmDelete,
    },
    exporting: {
      open: exportOpen,
      target: exportTarget,
      openExport,
      closeExport,
      exportAs,
    },
  };
}
