import { useCallback, useMemo, useState } from "react";
import { useSessionStore, useNotificationStore } from "../stores";
import { useActionGuard } from "./useActionGuard";
import type { ActionGuardActions } from "./useActionGuard";
import { segmentWorkflowService } from "../../application/workflows/SegmentWorkflowService";
import { translationWorkflowService } from "../../application/workflows/TranslationWorkflowService";
import { SegmentLogic } from "../../core/entities/SegmentLogic";
import type { SplitAnchor } from "./useSpanInteractions";

/** Promotes tags from the given segments to document level so they survive a split/join/shift. */
function promoteTagsForSegments(segmentIds: string[]) {
  const store = useSessionStore.getState();
  const tags = store.session?.tags || [];
  const affected = tags.filter(t => t.segmentId && segmentIds.includes(t.segmentId));
  if (affected.length === 0) return;

  const promoted = tags.map(t =>
    t.segmentId && segmentIds.includes(t.segmentId) ? { ...t, segmentId: undefined } : t
  );
  store.updateSession({ tags: promoted });
  useNotificationStore.getState().enqueue({
    message: `${affected.length} segment tag(s) promoted to document level. Re-run Sem-Tag on affected segments to regenerate.`,
    tone: "info",
    persistent: true,
  });
}

/**
 * Handles the three structural segment edits, split, join-up and boundary shift, and routes each through `useActionGuard` so the user is warned before changes that invalidate existing translations.
 */
export function useSegmentSplitMerge() {
  const session = useSessionStore((s) => s.session);
  const notify = useNotificationStore.getState().enqueue;

  const [splitAnchor, setSplitAnchor] = useState<SplitAnchor | null>(null);
  const [draggingFromIndex, setDraggingFromIndex] = useState<number | null>(null);

  const guardActions: ActionGuardActions = useMemo(() => ({
    translateSegment: async (segmentId: string, lang: string) => {
      const fresh = useSessionStore.getState().session;
      const result = await translationWorkflowService.addSegmentTranslation(lang, segmentId, {
        segments: fresh?.segments || [],
        translations: fresh?.translations || [],
      });
      if (result.ok && result.translationsPatch) {
        useSessionStore.getState().updateTranslations(result.translationsPatch);
      }
      if (!result.ok) throw new Error(result.notice.message);
    },
    deleteSegmentTranslation: (lang: string, segmentId: string) => {
      const fresh = useSessionStore.getState().session;
      const result = translationWorkflowService.deleteSegmentTranslation(lang, segmentId, {
        segments: fresh?.segments || [],
        translations: fresh?.translations || [],
      });
      if (result.ok && result.translationsPatch) {
        useSessionStore.getState().updateTranslations(result.translationsPatch);
      }
    },
  }), []);

  const { guardJoin, guardSplit, guardShift, dialogProps: guardDialogProps, closeDialog: closeGuardDialog } = useActionGuard(guardActions);

  const handleJoinUp = useCallback((segmentId: string) => {
    const idx = session?.segments?.findIndex(s => s.id === segmentId) ?? -1;
    if (idx <= 0 || !session?.segments) return;

    const seg1Id = session.segments[idx - 1].id;
    const segments = session.segments;
    const translations = session.translations || [];

    guardJoin(seg1Id, segmentId, segments, translations, () => {
      promoteTagsForSegments([seg1Id, segmentId]);
      const fresh = useSessionStore.getState().session;
      const result = segmentWorkflowService.joinSegments(seg1Id, segmentId, {
        translations: fresh?.translations || [],
        segments: fresh?.segments || [],
      });
      if (result.ok && result.patch) {
        useSessionStore.getState().updateSession(result.patch);
        useSessionStore.getState().incrementCounter({ group: 'segment', action: 'join' });
      }
      notify(result.notice);
    });
  }, [session?.segments, session?.translations, notify, guardJoin]);

  const handleConfirmSplit = useCallback(() => {
    if (!splitAnchor) return;
    const { pos, segmentId } = splitAnchor;
    const segments = session?.segments || [];
    const translations = session?.translations || [];

    setSplitAnchor(null);

    guardSplit(segmentId, segments, translations, () => {
      promoteTagsForSegments([segmentId]);
      const fresh = useSessionStore.getState().session;
      const freshDraft = useSessionStore.getState().draftText;
      const result = segmentWorkflowService.splitSegment(pos, {
        text: freshDraft,
        translations: fresh?.translations || [],
        segments: fresh?.segments || [],
      }, segmentId);
      if (result.ok && result.patch) {
        useSessionStore.getState().updateSession(result.patch);
        useSessionStore.getState().incrementCounter({ group: 'segment', action: 'split' });
      }
      notify(result.notice);
    });
  }, [splitAnchor, session?.translations, session?.segments, notify, guardSplit]);

  const handleShiftBoundary = useCallback((sourceSegmentId: string, globalTargetPos: number) => {
    const segments = session?.segments || [];
    const translations = session?.translations || [];

    setDraggingFromIndex(null);

    const swept = SegmentLogic.getSegmentsAffectedByBoundaryShift(
      segments,
      sourceSegmentId,
      globalTargetPos
    );
    const affectedIds = swept.length > 0 ? swept : [sourceSegmentId];

    guardShift(sourceSegmentId, globalTargetPos, segments, translations, async () => {
      promoteTagsForSegments(affectedIds);
      const fresh = useSessionStore.getState().session;
      const freshDraft = useSessionStore.getState().draftText;
      const result = await segmentWorkflowService.shiftSegmentBoundary(sourceSegmentId, globalTargetPos, {
        text: freshDraft,
        translations: fresh?.translations || [],
        segments: fresh?.segments || [],
      });
      if (result.ok && result.patch) {
        useSessionStore.getState().updateSession(result.patch);
        if (result.patch.text) {
          useSessionStore.getState().setDraftText(result.patch.text);
        }
        useSessionStore.getState().incrementCounter({ group: 'segment', action: 'shift' });
      }
      notify(result.notice);
    });
  }, [session?.segments, session?.translations, notify, guardShift]);

  return {
    splitAnchor,
    setSplitAnchor,
    draggingFromIndex,
    setDraggingFromIndex,
    handleJoinUp,
    handleConfirmSplit,
    handleShiftBoundary,
    guardDialogProps,
    closeGuardDialog,
  };
}
