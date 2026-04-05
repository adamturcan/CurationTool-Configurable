/**
 * A segment dto object, defined by character offsets.
 * Offsets (start/end) are the source of truth; `text` is derived or cached.
 *
 * @category Types
 */
export type Segment = {
  id: string;
  /** Character offset where the segment starts in the full text (0-based) */
  start: number;
  /** Character offset where the segment ends (exclusive) */
  end: number;
  text: string;
  order: number;
  isEdited?: boolean;
};

/** Backfills the `text` field on segments that only have offsets */
export function populateSegmentText(segments: Segment[], fullText: string): Segment[] {
  if (!segments || segments.length === 0 || !fullText) {
    return segments;
  }
  return segments.map(segment => {
    if (segment.text) return segment;
    return { ...segment, text: fullText.substring(segment.start, segment.end) };
  });
}