import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSessionStore, useWorkspaceStore, useNotificationStore, useAuthStore } from '../../stores';
import { resetUndoHistory } from '../../stores/sessionStore';
import { getWorkspaceApplicationService } from '../../../infrastructure/providers/workspaceProvider';
import { editorWorkflowService } from '../../../application/workflows/EditorWorkflowService';

/** Debounce for discrete actions (clicks, API results). */
const AUTOSAVE_ACTION_DEBOUNCE_MS = 1000;
/** Idle delay after the last keystroke before saving. */
const AUTOSAVE_TEXT_IDLE_MS = 3000;
/** Hard cap so sustained activity still flushes. */
const AUTOSAVE_MAX_DELAY_MS = 30000;

interface StateSynchronizerProps {
  children?: React.ReactNode;
}

/** Hydrates workspace metadata and session state from storage on route/user changes */
export const StateSynchronizer: React.FC<StateSynchronizerProps> = ({ children }) => {
  const location = useLocation();
  const isDirty = useSessionStore((state) => state.isDirty);
  const user = useAuthStore((s) => s.user);
  const username = user?.id ?? null;

  let workspaceId: string | undefined = undefined;

  const match = location.pathname.match(/^\/workspace\/([^/]+)/);
  if (match && match[1] !== 'new') {
    workspaceId = match[1];
  }

  // Hydrate workspace metadata when username changes
  useEffect(() => {
    if (!username) {
      return;
    }

    const hydrateMetadata = async () => {
      const { setWorkspaces } = useWorkspaceStore.getState();
      const { enqueue: enqueueNotification } = useNotificationStore.getState();

      try {
        const service = getWorkspaceApplicationService();
        const loaded = await service.loadForOwner(username);

        if (loaded && loaded.length > 0) {
          const metadata = loaded.map(ws => ({
            id: ws.id!,
            name: ws.name,
            owner: ws.owner ?? username,
            updatedAt: ws.updatedAt ?? Date.now(),
          }));

          setWorkspaces(metadata, username);
        } else {
          const seeded = service.seedForOwner(username);
          const metadata = seeded.map(ws => ({
            id: ws.id!,
            name: ws.name,
            owner: ws.owner ?? username,
            updatedAt: ws.updatedAt ?? Date.now(),
          }));

          setWorkspaces(metadata, username);
          await service.replaceAllForOwner(username, seeded);
        }

      } catch (error) {
        console.error('[StateSynchronizer] Failed to load workspace metadata:', error);
        enqueueNotification({
          message: 'Failed to load workspaces',
          tone: 'error',
        });
      }
    };

    void hydrateMetadata();
  }, [username]);

  // Hydrate the active session when the workspaceId changes
  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    const hydrateActiveSession = async () => {
      const { setLoading, loadSession } = useSessionStore.getState();
      const { setCurrentWorkspace } = useWorkspaceStore.getState();
      const { enqueue: enqueueNotification } = useNotificationStore.getState();

      setLoading();

      try {
        const service = getWorkspaceApplicationService();
        const workspace = await service.getWorkspaceById(workspaceId);

        if (!workspace) {
          throw new Error(`Workspace ${workspaceId} not found`);
        }

        loadSession(workspace);
        setCurrentWorkspace(workspaceId);
        // Wipe undo history so the hydration transition isn't undoable.
        resetUndoHistory();

      } catch (error) {
        console.error('[StateSynchronizer] Failed to load workspace session:', error);
        enqueueNotification({
          message: 'Failed to load workspace',
          tone: 'error',
        });
      }
    };

    void hydrateActiveSession();
  }, [workspaceId]);

  /** Autosave subscriber with separate debounces for typing and actions. */
  useEffect(() => {
    let textTimer: ReturnType<typeof setTimeout> | null = null;
    let actionTimer: ReturnType<typeof setTimeout> | null = null;
    let maxTimer: ReturnType<typeof setTimeout> | null = null;
    let saving = false;
    let dirtySince: number | null = null;

    const clearTimers = () => {
      if (textTimer) { clearTimeout(textTimer); textTimer = null; }
      if (actionTimer) { clearTimeout(actionTimer); actionTimer = null; }
      if (maxTimer) { clearTimeout(maxTimer); maxTimer = null; }
    };

    const triggerSave = async () => {
      const { session, draftText, isDirty: currentDirty, updateSession } = useSessionStore.getState();
      if (saving || !currentDirty || !session?.id) return;
      saving = true;
      clearTimers();
      dirtySince = null;
      const sessionAtSave = session;
      const draftAtSave = draftText;
      let shouldRetry = false;
      try {
        const result = await editorWorkflowService.saveWorkspace(session, draftText);
        if (result.ok) {
          const latest = useSessionStore.getState();
          // Skip the patch and retry if state drifted during the save.
          const drifted = latest.session !== sessionAtSave || latest.draftText !== draftAtSave;
          if (drifted) {
            shouldRetry = true;
          } else if (result.sessionPatch) {
            updateSession(result.sessionPatch);
          }
          if (result.workspaceMetadataPatch) {
            useWorkspaceStore.getState().updateWorkspaceMetadata(session.id, result.workspaceMetadataPatch);
          }
        } else {
          useNotificationStore.getState().enqueue(result.notice);
        }
      } finally {
        saving = false;
        if (shouldRetry) {
          actionTimer = setTimeout(triggerSave, AUTOSAVE_ACTION_DEBOUNCE_MS);
          armMaxTimer();
        }
      }
    };

    const armMaxTimer = () => {
      if (dirtySince !== null) return;
      dirtySince = Date.now();
      maxTimer = setTimeout(triggerSave, AUTOSAVE_MAX_DELAY_MS);
    };

    /** True for one tick after draftText changes, so segment updates in the same burst are classified as typing. */
    let draftTextJustChanged = false;

    const unsub = useSessionStore.subscribe((state, prev) => {
      // Cancel pending autosaves once state is clean.
      if (!state.isDirty) {
        clearTimers();
        dirtySince = null;
        return;
      }
      if (!state.session?.id) return;

      const countersChanged = prev.session?.counters !== state.session.counters;
      const draftTextChanged = prev.draftText !== state.draftText;
      if (draftTextChanged) {
        draftTextJustChanged = true;
        setTimeout(() => { draftTextJustChanged = false; }, 0);
      }

      const segmentsChanged = prev.session?.segments !== state.session.segments;
      const isTypingBurst = draftTextChanged || (segmentsChanged && draftTextJustChanged);

      // Content changes from API calls or programmatic mutations (no counters/draft touched).
      const apiContentChanged =
        !isTypingBurst && (
          segmentsChanged ||
          prev.session?.userSpans !== state.session.userSpans ||
          prev.session?.apiSpans !== state.session.apiSpans ||
          prev.session?.deletedApiKeys !== state.session.deletedApiKeys ||
          prev.session?.tags !== state.session.tags ||
          prev.session?.translations !== state.session.translations
        );

      if (countersChanged || apiContentChanged) {
        // Action debounce supersedes any in-flight typing-idle timer.
        if (textTimer) { clearTimeout(textTimer); textTimer = null; }
        if (actionTimer) clearTimeout(actionTimer);
        actionTimer = setTimeout(triggerSave, AUTOSAVE_ACTION_DEBOUNCE_MS);
        armMaxTimer();
      } else if (isTypingBurst) {
        if (textTimer) clearTimeout(textTimer);
        textTimer = setTimeout(triggerSave, AUTOSAVE_TEXT_IDLE_MS);
        armMaxTimer();
      } else {
        armMaxTimer();
      }
    });

    return () => {
      clearTimers();
      unsub();
    };
  }, []);

  // Guard: browser refresh / tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Guard: browser back/forward buttons
  const showGuard = useNotificationStore((s) => s.showUnsavedGuard);
  useEffect(() => {
    if (!isDirty) return;

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      showGuard(() => window.history.back());
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty, showGuard]);

  return <>{children}</>;
};
