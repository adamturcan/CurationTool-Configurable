import { useMemo, type DragEvent } from "react";

interface Params {
  /** Caller-supplied disable flag (e.g. dropping from above source segment). */
  dropDisabled: boolean;
  /** Whether a segment-drag is currently in progress globally. */
  isDragging: boolean;
  /** True when the segment is showing a translation tab — boundary shifts are original-only. */
  isTranslationView: boolean;
  /** Called with no args when a drop is rejected because of `effectiveDropDisabled`. */
  onInvalidDrop?: () => void;
}

interface DragTargetHandlers {
  onDragEnter: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}

/**
 * Bundles the drop-target wiring for a segment block.
 * Returns the three drag handlers to spread on the outer element plus the `effectiveDropDisabled` flag for styling.
 */
export function useSegmentDragTarget({
  dropDisabled,
  isDragging,
  isTranslationView,
  onInvalidDrop,
}: Params): { handlers: DragTargetHandlers; effectiveDropDisabled: boolean } {
  const effectiveDropDisabled = dropDisabled || (isDragging && isTranslationView);

  const handlers = useMemo<DragTargetHandlers>(() => ({
    onDragEnter: (e) => {
      if (e.dataTransfer.types.includes("application/segment-id") && !effectiveDropDisabled) {
        e.preventDefault();
      }
    },
    onDragOver: (e) => {
      if (e.dataTransfer.types.includes("application/segment-id")) {
        if (effectiveDropDisabled) {
          e.dataTransfer.dropEffect = "none";
        } else {
          e.preventDefault();
        }
      }
    },
    onDrop: (e) => {
      if (e.dataTransfer.types.includes("application/segment-id")) {
        e.preventDefault();
        e.stopPropagation();
        if (effectiveDropDisabled && onInvalidDrop) {
          onInvalidDrop();
        }
      }
    },
  }), [effectiveDropDisabled, onInvalidDrop]);

  return { handlers, effectiveDropDisabled };
}
