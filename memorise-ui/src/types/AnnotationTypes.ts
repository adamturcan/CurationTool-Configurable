import type { NerSpan } from "./NotationEditor";

/**
 * Flattened view of the currently active editing layer (original or translation).
 * Unifies the fields the editor needs regardless of which source they come from.
 *
 * @category Types
 */
export type AnnotationLayer = {
    text: string;
    userSpans: NerSpan[];
    apiSpans: NerSpan[];
    segmentTranslations?: Record<string, string>;
    editedSegmentTranslations?: Record<string, boolean>;
};
