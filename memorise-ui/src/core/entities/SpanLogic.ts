import type { NerSpan, SpanCoordMap } from "../../types";

/**
 * Pure functions for NER span coordinate math. Handles offset translations
 * between global (full text) and local (per-segment) coordinate spaces,
 * and span shifting/removal when text is edited.
 *
 * @category Entities
 */
export const SpanLogic = {

  /** Stable key for filtering deleted API spans: `${start}:${end}:${entity}`. */
  getBanKey: (span: Pick<NerSpan, "start" | "end" | "entity">): string =>
    `${span.start}:${span.end}:${span.entity}`,

  /** Converts a segment-local span to global coordinates by adding `virtualStart`. */
  toGlobal: (span: NerSpan, virtualStart: number): NerSpan => ({
    ...span,
    start: span.start + virtualStart,
    end: span.end + virtualStart,
  }),

  /** Updates span positions from CodeMirror's live coordinates, tracking which spans were shifted */
  syncLiveCoords: (
    spans: NerSpan[],
    liveCoords: SpanCoordMap,
    globalOffset: number,
    shiftedSet: Set<string>
  ): NerSpan[] => {
    return spans.map((s) => {
      const id = s.id ?? `span-${s.start}-${s.end}-${s.entity}`;
      const coords = liveCoords.get(id);
      if (coords) {
        shiftedSet.add(id);
        const globalStart = coords.start + globalOffset;
        const globalEnd = coords.end + globalOffset;
        if (s.start !== globalStart || s.end !== globalEnd) {
          return { ...s, start: globalStart, end: globalEnd, id };
        }
      }
      return { ...s, id };
    });
  },

  /** Shifts all spans at or after `boundary` by `delta` character positions */
  shiftSpansFrom: (
    spans: NerSpan[],
    boundary: number,
    delta: number
  ): NerSpan[] => {
    if (delta === 0) return spans;
    return spans.map(s => {
      const newStart = s.start >= boundary ? s.start + delta : s.start;
      const newEnd = s.end >= boundary ? s.end + delta : s.end;
      if (newStart !== s.start || newEnd !== s.end) {
        return { ...s, start: newStart, end: newEnd };
      }
      return s;
    });
  },

  /** Removes spans that overlap the given character range */
  removeSpansInRange: (
    spans: NerSpan[],
    rangeStart: number,
    rangeEnd: number
  ): NerSpan[] => {
    return spans.filter(s => s.end <= rangeStart || s.start >= rangeEnd);
  },

  /** Shifts spans after a text edit, skipping those already handled by syncLiveCoords */
  shiftSpansAfterEdit: (
    spans: NerSpan[],
    editGlobalEndIndex: number,
    lengthDiff: number,
    shiftedSet: Set<string>
  ): NerSpan[] => {
    if (lengthDiff === 0) return spans;
    return spans.map(s => {
      const id = s.id ?? `span-${s.start}-${s.end}-${s.entity}`;
      if (shiftedSet.has(id)) return s;

      let newStart = s.start;
      let newEnd = s.end;
      if (s.start >= editGlobalEndIndex) newStart += lengthDiff;
      if (s.end >= editGlobalEndIndex) newEnd += lengthDiff;

      if (newStart !== s.start || newEnd !== s.end) return { ...s, start: newStart, end: newEnd };
      return s;
    });
  },

  /**
   * Returns spans visible inside a segment for one annotation layer:
   * combines API spans (minus banned keys) with user spans, filters by overlap
   * against the segment range, and clips to segment-local coordinates.
   * Banned-key format is `${start}:${end}:${entity}` (set by AnnotationWorkflowService).
   */
  getVisibleSpansForSegment: (
    apiSpans: NerSpan[] | undefined,
    userSpans: NerSpan[] | undefined,
    deletedApiKeys: string[] | undefined,
    globalStart: number,
    globalEnd: number
  ): NerSpan[] => {
    const banned = new Set(deletedApiKeys ?? []);
    const filteredApi = (apiSpans ?? []).filter(
      (s) => !banned.has(SpanLogic.getBanKey(s))
    );
    const all = [...filteredApi, ...(userSpans ?? [])];
    const length = globalEnd - globalStart;
    return all
      .filter((s) => Math.max(s.start, globalStart) < Math.min(s.end, globalEnd))
      .map((s) => ({
        ...s,
        id: s.id ?? `span-${s.start}-${s.end}-${s.entity}`,
        start: Math.max(0, s.start - globalStart),
        end: Math.min(length, s.end - globalStart),
      }));
  },

  /** Removes overlapping spans and shifts remaining spans for both user and API layers at once */
  removeAndShiftBoth: (
    userSpans: NerSpan[],
    apiSpans: NerSpan[],
    rangeStart: number,
    rangeEnd: number,
    delta: number
  ): { nextUserSpans: NerSpan[]; nextApiSpans: NerSpan[] } => {
    let nextUserSpans = SpanLogic.removeSpansInRange(userSpans, rangeStart, rangeEnd);
    nextUserSpans = SpanLogic.shiftSpansFrom(nextUserSpans, rangeEnd, delta);
    let nextApiSpans = SpanLogic.removeSpansInRange(apiSpans, rangeStart, rangeEnd);
    nextApiSpans = SpanLogic.shiftSpansFrom(nextApiSpans, rangeEnd, delta);
    return { nextUserSpans, nextApiSpans };
  }
};