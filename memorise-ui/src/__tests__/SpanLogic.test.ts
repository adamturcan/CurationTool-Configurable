import { describe, it, expect } from 'vitest';

import { SpanLogic } from '../core/entities/SpanLogic';
import type { NerSpan } from '../types/NotationEditor';

const span = (start: number, end: number, entity = 'PER'): NerSpan => ({
  start,
  end,
  entity,
});

describe('SpanLogic.removeSpansInRange', () => {
  it('keeps spans that lie entirely outside the deleted range', () => {
    const spans = [span(0, 5), span(20, 25)];
    expect(SpanLogic.removeSpansInRange(spans, 10, 15)).toEqual(spans);
  });

  it('removes a span that overlaps the left edge of the range', () => {
    const overlapping = span(8, 12);
    const safe = span(0, 5);
    const result = SpanLogic.removeSpansInRange([safe, overlapping], 10, 15);
    expect(result).toEqual([safe]);
  });

  it('removes a span that overlaps the right edge of the range', () => {
    const overlapping = span(13, 18);
    const safe = span(20, 25);
    const result = SpanLogic.removeSpansInRange([overlapping, safe], 10, 15);
    expect(result).toEqual([safe]);
  });

  it('removes a span that is fully contained within the range', () => {
    const contained = span(11, 14);
    const result = SpanLogic.removeSpansInRange([contained], 10, 15);
    expect(result).toEqual([]);
  });

  it('keeps a span whose start touches the right edge of the range', () => {
    const touching = span(15, 20);
    const result = SpanLogic.removeSpansInRange([touching], 10, 15);
    expect(result).toEqual([touching]);
  });
});

describe('SpanLogic.shiftSpansFrom', () => {
  it('shifts spans at or after the boundary by a positive delta', () => {
    const before = span(0, 5);
    const after = span(10, 15);
    const result = SpanLogic.shiftSpansFrom([before, after], 10, 3);
    expect(result).toEqual([span(0, 5), span(13, 18)]);
  });

  it('shifts spans at or after the boundary by a negative delta', () => {
    const before = span(0, 5);
    const after = span(10, 15);
    const result = SpanLogic.shiftSpansFrom([before, after], 10, -4);
    expect(result).toEqual([span(0, 5), span(6, 11)]);
  });

  it('shifts only the end of a span that straddles the boundary', () => {
    const straddling = span(8, 12);
    const result = SpanLogic.shiftSpansFrom([straddling], 10, 3);
    expect(result).toEqual([span(8, 15)]);
  });

  it('returns the original array reference when delta is zero', () => {
    const spans = [span(0, 5), span(10, 15)];
    expect(SpanLogic.shiftSpansFrom(spans, 5, 0)).toBe(spans);
  });
});

describe('SpanLogic.removeAndShiftBoth', () => {
  it('removes overlapping spans and shifts trailing spans in a single pass', () => {
    const userSpans = [span(0, 5, 'PER'), span(11, 14, 'LOC'), span(20, 25, 'ORG')];
    const apiSpans = [span(8, 12, 'DATE'), span(30, 35, 'MISC')];

    const { nextUserSpans, nextApiSpans } = SpanLogic.removeAndShiftBoth(
      userSpans,
      apiSpans,
      10,
      15,
      -5,
    );

    expect(nextUserSpans).toEqual([span(0, 5, 'PER'), span(15, 20, 'ORG')]);
    expect(nextApiSpans).toEqual([span(25, 30, 'MISC')]);
  });

  it('processes user and api layers independently', () => {
    const userSpans = [span(11, 14, 'PER')];
    const apiSpans = [span(20, 25, 'LOC')];

    const { nextUserSpans, nextApiSpans } = SpanLogic.removeAndShiftBoth(
      userSpans,
      apiSpans,
      10,
      15,
      2,
    );

    expect(nextUserSpans).toEqual([]);
    expect(nextApiSpans).toEqual([span(22, 27, 'LOC')]);
  });
});
