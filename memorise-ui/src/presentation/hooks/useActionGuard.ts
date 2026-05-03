import { useState, useCallback } from "react";
import type { ActionGuardDialogProps, ResolutionStep } from "../components/editor/dialogs";
import type { TranslationDTO, Segment } from "../../types";
import { TranslationLogic } from "../../core/entities/TranslationLogic";
import { SegmentLogic } from "../../core/entities/SegmentLogic";

/** Callbacks injected by the consumer to keep the hook decoupled from services */
export interface ActionGuardActions {
  /** Translate a single segment - injected by the consumer so the hook stays decoupled from services. */
  translateSegment: (segmentId: string, lang: string) => Promise<void>;
  /** Delete a single segment's translation - injected by consumer. */
  deleteSegmentTranslation: (lang: string, segmentId: string) => void;
}

/** Return type for the useActionGuard hook */
interface UseActionGuardReturn {
  guardJoin: (
    seg1Id: string,
    seg2Id: string,
    segments: Segment[],
    translations: TranslationDTO[],
    onProceed: () => void
  ) => void;

  guardSplit: (
    segmentId: string,
    segments: Segment[],
    translations: TranslationDTO[],
    onProceed: () => void
  ) => void;

  guardShift: (
    sourceSegId: string,
    targetPos: number,
    segments: Segment[],
    translations: TranslationDTO[],
    onProceed: () => void
  ) => void;

  guardGlobalSplit: (
    segments: Segment[],
    onProceed: () => void
  ) => void;

  dialogProps: ActionGuardDialogProps | null;
  closeDialog: () => void;
}

/** Guards segment operations (join/split/shift) by detecting translation conflicts and prompting resolution */
export function useActionGuard(actions: ActionGuardActions): UseActionGuardReturn {
  const [dialogProps, setDialogProps] = useState<ActionGuardDialogProps | null>(null);

  const closeDialog = useCallback(() => setDialogProps(null), []);

  //Join with irregular translations

  const guardJoin = useCallback(
    (
      seg1Id: string,
      seg2Id: string,
      segments: Segment[],
      translations: TranslationDTO[],
      onProceed: () => void
    ) => {
      if (!translations.length) {
        onProceed();
        return;
      }

      const gaps = TranslationLogic.detectTranslationGaps([seg1Id, seg2Id], segments, translations);

      if (gaps.length === 0) {
        onProceed();
        return;
      }

      const steps: ResolutionStep[] = gaps.map(gap => ({
        label: `Translate segment ${gap.segmentOrder + 1} → ${gap.lang.toUpperCase()}`,
        action: () => actions.translateSegment(gap.segmentId, gap.lang),
      }));

      setDialogProps({
        open: true,
        onClose: closeDialog,
        mode: "resolution",
        title: "Cannot Join - Missing Translations",
        description:
          "These segments have inconsistent translations across languages. " +
          "Some languages are missing translations for one of the segments. " +
          "Joining them now would result in incomplete translated content.",
        resolutionLabel: "Translate Missing & Join",
        resolutionSteps: steps,
        onResolutionComplete: onProceed,
      });
    },
    [actions, closeDialog]
  );

  // Split with existing translation

  const guardSplit = useCallback(
    (
      segmentId: string,
      segments: Segment[],
      translations: TranslationDTO[],
      onProceed: () => void
    ) => {
      const langs = TranslationLogic.getLanguagesWithSegmentTranslation(translations, segmentId);

      if (langs.length === 0) {
        onProceed();
        return;
      }

      const seg = segments.find(s => s.id === segmentId);
      const segLabel = seg ? `segment ${seg.order + 1}` : "this segment";

      const steps: ResolutionStep[] = langs.map(lang => ({
        label: `Delete ${lang.toUpperCase()} translation for ${segLabel}`,
        action: async () => actions.deleteSegmentTranslation(lang, segmentId),
      }));

      setDialogProps({
        open: true,
        onClose: closeDialog,
        mode: "resolution",
        title: "Cannot Split - Translation Exists",
        description:
          `${segLabel.charAt(0).toUpperCase() + segLabel.slice(1)} has translations in: ${langs.map(l => l.toUpperCase()).join(", ")}. ` +
          "Splitting a segment with existing translations would break text alignment. " +
          "The translations must be removed first.",
        resolutionLabel: "Delete Translations & Split",
        resolutionSteps: steps,
        onResolutionComplete: onProceed,
      });
    },
    [actions, closeDialog]
  );

  // Shift boundary with untranslated parts

  const guardShift = useCallback(
    (
      sourceSegId: string,
      targetPos: number,
      segments: Segment[],
      translations: TranslationDTO[],
      onProceed: () => void
    ) => {
      if (!translations.length) {
        onProceed();
        return;
      }

      const affectedIds = SegmentLogic.getSegmentsAffectedByBoundaryShift(
        segments,
        sourceSegId,
        targetPos
      );

      if (affectedIds.length === 0) {
        onProceed();
        return;
      }

      const gaps = TranslationLogic.detectTranslationGaps(affectedIds, segments, translations);

      if (gaps.length === 0) {
        onProceed();
        return;
      }

      const steps: ResolutionStep[] = gaps.map(gap => ({
        label: `Translate segment ${gap.segmentOrder + 1} → ${gap.lang.toUpperCase()}`,
        action: () => actions.translateSegment(gap.segmentId, gap.lang),
      }));

      setDialogProps({
        open: true,
        onClose: closeDialog,
        mode: "resolution",
        title: "Cannot Shift - Untranslated Segments in Path",
        description:
          `Shifting this boundary affects ${affectedIds.length} segment(s). ` +
          "Some are missing translations. The shift will merge content, " +
          "and untranslated gaps would create inconsistent results.",
        resolutionLabel: "Translate Missing & Shift",
        resolutionSteps: steps,
        onResolutionComplete: onProceed,
      });
    },
    [actions, closeDialog]
  );

  // Global API split prevention

  const guardGlobalSplit = useCallback(
    (segments: Segment[], onProceed: () => void) => {
      if (segments.length > 1) {
        setDialogProps({
          open: true,
          onClose: closeDialog,
          mode: "block",
          title: "Document Already Segmented",
          description:
            "Auto-segmentation has already been performed on this document. " +
            "Running it again is not allowed.",
        });
        return;
      }

      onProceed();
    },
    [closeDialog]
  );

  return {
    guardJoin,
    guardSplit,
    guardShift,
    guardGlobalSplit,
    dialogProps,
    closeDialog,
  };
}
