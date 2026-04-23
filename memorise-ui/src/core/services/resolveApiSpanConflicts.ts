/**
 * Resolves conflicts when new API spans overlap existing user or API spans.
 * Walks each incoming span, detects overlaps, and prompts the user to choose
 * which to keep via an async callback. Non-conflicting spans are auto-accepted.
 *
 * @category Services
 */
import type { NerSpan } from "../../types";

const keyOfSpan = (s: NerSpan) => `${s.start}:${s.end}:${s.entity}`;
const spansOverlap = (a: NerSpan, b: NerSpan) => a.start < b.end && b.start < a.end;

export type ConflictSource = "user" | "api";

/** A single span involved in a conflict, with a text snippet for display */
export interface ConflictEntry {
  span: NerSpan;
  snippet: string;
  source: ConflictSource;
  segmentIndex?: number;
}

/** 1-based segment extent in the same coordinate space as the span offsets */
export interface SegmentBoundary {
  start: number;
  end: number;
  index: number;
}

/** Data passed to the UI dialog for each conflict — user picks "api" or "existing" */
export interface ConflictPrompt {
  candidate: ConflictEntry;
  conflicts: ConflictEntry[];
  index: number;
  total: number;
  language?: string;
}

export const resolveApiSpanConflicts = async (params: {
  text: string;
  incomingSpans: NerSpan[];
  userSpans: NerSpan[];
  existingApiSpans: NerSpan[];
  onConflict: (prompt: ConflictPrompt) => Promise<"api" | "existing">;
  segmentBoundaries?: SegmentBoundary[];
  language?: string;
}): Promise<{ nextUserSpans: NerSpan[]; nextApiSpans: NerSpan[]; conflictsHandled: number }> => {
  const { text, incomingSpans, userSpans, existingApiSpans, onConflict, segmentBoundaries, language } = params;

  const locateSegment = (offset: number): number | undefined => {
    if (!segmentBoundaries) return undefined;
    const found = segmentBoundaries.find(b => offset >= b.start && offset < b.end);
    return found?.index;
  };

  // Mutable copy of user spans — entries may be removed if user chooses "api"
  let nextUserSpans = [...userSpans];

  // Track retained existing API spans by key — removals happen during conflict resolution
  const retainedApiMap = new Map<string, NerSpan>();
  existingApiSpans.forEach((span) => {
    retainedApiMap.set(keyOfSpan(span), span);
  });

  const acceptedNewApiSpans: NerSpan[] = [];

  // Pre-count user conflicts for progress indicator in the dialog
  const totalUserConflicts = incomingSpans.reduce((count, candidate) => {
    if (userSpans.some((existing) => spansOverlap(candidate, existing))) {
      return count + 1;
    }
    return count;
  }, 0);

  let conflictIndex = 0;
  let conflictsHandled = 0;

  for (const candidate of incomingSpans) {
    const conflictingUserSpans = nextUserSpans.filter((existing) =>
      spansOverlap(candidate, existing)
    );
    const conflictingApiSpans = Array.from(retainedApiMap.values()).filter((existing) =>
      spansOverlap(candidate, existing)
    );

    // No conflicts — auto-accept the incoming span
    if (conflictingUserSpans.length === 0 && conflictingApiSpans.length === 0) {
      acceptedNewApiSpans.push(candidate);
      continue;
    }

    // Only API-vs-API conflict with same entity type — silently replace (no user prompt)
    if (conflictingUserSpans.length === 0) {
      const hasEntityChange = conflictingApiSpans.some(
        (existing) => existing.entity !== candidate.entity
      );

      if (!hasEntityChange) {
        conflictingApiSpans.forEach((span) => {
          retainedApiMap.delete(keyOfSpan(span));
        });
        acceptedNewApiSpans.push(candidate);
        continue;
      }
    }

    // Real conflict — prompt the user to choose
    conflictIndex += 1;
    conflictsHandled += 1;

    const conflictPrompt: ConflictPrompt = {
      candidate: {
        span: candidate,
        snippet: text.slice(candidate.start, candidate.end) || "[empty]",
        source: "api",
        segmentIndex: locateSegment(candidate.start),
      },
      conflicts: [
        ...conflictingUserSpans.map((span) => ({
          span,
          snippet: text.slice(span.start, span.end) || "[empty]",
          source: "user" as const,
          segmentIndex: locateSegment(span.start),
        })),
        ...conflictingApiSpans.map((span) => ({
          span,
          snippet: text.slice(span.start, span.end) || "[empty]",
          source: "api" as const,
          segmentIndex: locateSegment(span.start),
        })),
      ],
      index: conflictIndex,
      total: totalUserConflicts || conflictIndex,
      language,
    };

    const choice = await onConflict(conflictPrompt);

    // User chose the new API span — remove all conflicting spans it replaces
    if (choice === "api") {
      if (conflictingUserSpans.length > 0) {
        const toRemove = new Set(conflictingUserSpans.map((span) => keyOfSpan(span)));
        nextUserSpans = nextUserSpans.filter(
          (existing) => !toRemove.has(keyOfSpan(existing))
        );
      }

      if (conflictingApiSpans.length > 0) {
        conflictingApiSpans.forEach((span) => {
          retainedApiMap.delete(keyOfSpan(span));
        });
      }

      acceptedNewApiSpans.push(candidate);
    }
  }

  // Merge retained existing API spans with newly accepted ones, deduped by key
  const finalApiMap = new Map<string, NerSpan>();
  retainedApiMap.forEach((span, key) => finalApiMap.set(key, span));
  acceptedNewApiSpans.forEach((span) => finalApiMap.set(keyOfSpan(span), span));

  return {
    nextUserSpans,
    nextApiSpans: Array.from(finalApiMap.values()),
    conflictsHandled,
  };
};

