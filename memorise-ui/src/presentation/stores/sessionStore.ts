/**
 * Current workspace editing state. Holds the full workspace DTO,
 * draft text, active tab/segment, dirty tracking, and UI state.
 * All workflow results flow here via updateSession() or updateTranslations().
 *
 * @category Stores
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { temporal } from 'zundo';
import type {
  WorkspaceDTO,
  TranslationDTO,
  WorkspaceCounters,
  NerBreakdown,
  SegmentBreakdown,
} from '../../types';
import { populateSegmentText, emptyCounters } from '../../types';

/**
 * Discriminated kind for {@link SessionStore.incrementCounter}. Each increment
 * bumps both the matching headline aggregate and the matching breakdown field
 * atomically so the invariant `sum(breakdown) === headline` always holds.
 */
export type CounterKind =
  | { group: 'ner'; action: keyof NerBreakdown }
  | { group: 'segment'; action: keyof SegmentBreakdown }
  | { group: 'tag'; action: 'add' | 'remove' };

interface SessionStore {
  session: WorkspaceDTO | null;
  draftText: string;
  activeTab: string;
  activeSegmentId: string | undefined;
  isDirty: boolean;

  isTagPanelOpen: boolean;
  setTagPanelOpen: (isOpen: boolean) => void;
  isDragging: boolean;
  setDragging: (dragging: boolean) => void;

  loadSession: (workspace: WorkspaceDTO) => void;
  setLoading: () => void;
  setDraftText: (text: string) => void;
  updateTranslations: (translations: TranslationDTO[]) => void;
  updateSession: (updates: Partial<WorkspaceDTO>) => void;
  incrementCounter: (kind: CounterKind) => void;
  setActiveTab: (tab: string) => void;
  setActiveSegmentId: (id: string | undefined) => void;
}

function ensureCounters(counters: WorkspaceCounters | undefined): WorkspaceCounters {
  if (!counters) return emptyCounters();
  return {
    ...counters,
    nerBreakdown: { ...counters.nerBreakdown },
    segmentBreakdown: { ...counters.segmentBreakdown },
  };
}

/** Module-scoped undo-burst timer state so {@link resetUndoHistory} can cancel pending snapshots. */
let handleSetTimer: ReturnType<typeof setTimeout> | null = null;
let handleSetFirstPastState: unknown = undefined;

export const useSessionStore = create<SessionStore>()(
  devtools(
    temporal(
      (set, get) => ({
      session: null,
      draftText: "",
      activeTab: "original",
      activeSegmentId: undefined,

      isTagPanelOpen: false,
      setTagPanelOpen: (isOpen) => set({ isTagPanelOpen: isOpen }),
      isDragging: false,
      setDragging: (dragging) => set({ isDragging: dragging }),

      isDirty: false,

      loadSession: (workspace) => {
        const populatedSegments = workspace.segments
          ? populateSegmentText(workspace.segments, workspace.text || "")
          : [];

        const normalized: WorkspaceDTO = {
          ...workspace,
          userSpans: workspace.userSpans ?? [],
          apiSpans: workspace.apiSpans ?? [],
          deletedApiKeys: workspace.deletedApiKeys ?? [],
          tags: workspace.tags ?? [],
          translations: workspace.translations ?? [],
          segments: populatedSegments,
          counters: ensureCounters(workspace.counters),
        };

        set({
          session: normalized,
          draftText: normalized.text || "",
          isDirty: false,
          activeTab: "original",
          activeSegmentId: undefined,
        });
      },

      setLoading: () => {
        set({
          session: {
            id: "",
            name: "",
            owner: "",
            updatedAt: 0,
            text: "",
            userSpans: [],
            apiSpans: [],
            deletedApiKeys: [],
            tags: [],
            translations: [],
            segments: [],
            counters: emptyCounters(),
          },
          draftText: "",
          isDirty: false,
        });
      },

      setDraftText: (newText) => {
        const state = get();
        if (state.draftText === newText) return;
        set({
          draftText: newText,
          isDirty: newText !== state.session?.text,
        });
      },

      updateTranslations: (nextTranslations) => {
        const state = get();
        if (!state.session) return;
        if (state.session.translations === nextTranslations) return;
        set({
          session: { ...state.session, translations: nextTranslations },
          isDirty: true,
        });
      },

      /** Merge a partial patch; no-op when nothing changes. Dirty unless explicitly cleared. */
      updateSession: (updates) => {
        const state = get();
        if (!state.session) return;
        const current = state.session;
        const hasSessionChange = Object.entries(updates).some(
          ([key, value]) => key !== 'isDirty' && current[key as keyof WorkspaceDTO] !== value
        );
        const hasDirtyChange =
          'isDirty' in updates && state.isDirty !== !!(updates as { isDirty?: unknown }).isDirty;
        if (!hasSessionChange && !hasDirtyChange) return;
        const { isDirty: _omit, ...sessionOnly } = updates as { isDirty?: unknown } & Partial<WorkspaceDTO>;
        void _omit;
        set({
          session: hasSessionChange ? { ...current, ...sessionOnly } : current,
          isDirty: 'isDirty' in updates ? !!(updates as { isDirty?: unknown }).isDirty : true,
        });
      },

      /** Bump headline and breakdown counter together so `sum(breakdown) === headline`. */
      incrementCounter: (kind) => {
        const state = get();
        if (!state.session) return;
        const current = ensureCounters(state.session.counters);

        if (kind.group === 'ner') {
          current.nerBreakdown[kind.action] += 1;
          current.nerEdits += 1;
        } else if (kind.group === 'segment') {
          current.segmentBreakdown[kind.action] += 1;
          current.segmentEdits += 1;
        } else if (kind.action === 'add') {
          current.tagAdds += 1;
        } else {
          current.tagRemovals += 1;
        }

        set({
          session: { ...state.session, counters: current },
          isDirty: true,
        });
      },

      setActiveTab: (tab) => set({ activeTab: tab }),
      setActiveSegmentId: (id) => set({ activeSegmentId: id }),
    }),
      {
        partialize: (state) => ({ session: state.session, draftText: state.draftText }),
        limit: 50,
        /** Skip snapshots that don't change user-visible content. */
        equality: (past, current) => {
          if (past.draftText !== current.draftText) return false;
          if (past.session === current.session) return true;
          const ps = past.session;
          const cs = current.session;
          if (!ps || !cs) return ps === cs;
          return (
            ps.segments === cs.segments &&
            ps.userSpans === cs.userSpans &&
            ps.apiSpans === cs.apiSpans &&
            ps.deletedApiKeys === cs.deletedApiKeys &&
            ps.tags === cs.tags &&
            ps.translations === cs.translations &&
            ps.counters === cs.counters
          );
        },
        /** Debounce bursts so one undo reverts the whole burst, keeping the first pastState. */
        handleSet: (handleSet) => (pastState) => {
          if (handleSetTimer === null) {
            handleSetFirstPastState = pastState;
          } else {
            clearTimeout(handleSetTimer);
          }
          handleSetTimer = setTimeout(() => {
            if (handleSetFirstPastState !== undefined) {
              handleSet(handleSetFirstPastState as Parameters<typeof handleSet>[0]);
            }
            handleSetTimer = null;
            handleSetFirstPastState = undefined;
          }, 500);
        },
      }
    ),
    { name: 'session-store' }
  )
);

/** Cancel any pending undo snapshot and wipe recorded history. */
export function resetUndoHistory(): void {
  if (handleSetTimer !== null) {
    clearTimeout(handleSetTimer);
    handleSetTimer = null;
  }
  handleSetFirstPastState = undefined;
  useSessionStore.temporal.getState().clear();
}