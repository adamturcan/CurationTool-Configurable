import type { NerSpan } from "./NotationEditor";
import type { TagItem } from "./Tag";
import type { Segment } from "./Segment";

/**
 * Breakdown of fine-grained NER actions counted during a user-testing session.
 *
 * @category Types
 */
export type NerBreakdown = {
  created: number;
  deletedUser: number;
  deletedApi: number;
  categoryChanged: number;
  textEdited: number;
};

/**
 * Breakdown of segment-boundary actions counted during a user-testing session.
 *
 * @category Types
 */
export type SegmentBreakdown = {
  split: number;
  join: number;
  shift: number;
};

/**
 * Monotonic per-workspace counters of UI actions. Headline aggregates mirror
 * the breakdown sums (invariant: `created + deletedUser + deletedApi +
 * categoryChanged + textEdited === nerEdits`; same for segments).
 *
 * @category Types
 */
export type WorkspaceCounters = {
  nerEdits: number;
  tagAdds: number;
  segmentEdits: number;
  nerBreakdown: NerBreakdown;
  segmentBreakdown: SegmentBreakdown;
  tagRemovals: number;
};

export function emptyCounters(): WorkspaceCounters {
  return {
    nerEdits: 0,
    tagAdds: 0,
    segmentEdits: 0,
    nerBreakdown: {
      created: 0,
      deletedUser: 0,
      deletedApi: 0,
      categoryChanged: 0,
      textEdited: 0,
    },
    segmentBreakdown: {
      split: 0,
      join: 0,
      shift: 0,
    },
    tagRemovals: 0,
  };
}

/**
 * Core workspace DTO persisted to localStorage.
 * Contains source text, NER spans (user vs API), segments, tags, and translations.
 *
 * @category Types
 */
export type WorkspaceDTO = {
  id: string;
  name: string;
  isTemporary?: boolean;
  text?: string;
  /** Manually created spans — kept separate from apiSpans for conflict resolution */
  userSpans?: NerSpan[];
  apiSpans?: NerSpan[];
  /** API span IDs the user dismissed, so they don't reappear on re-run */
  deletedApiKeys?: string[];
  createdAt?: number;
  updatedAt?: number;
  owner?: string;

  tags?: TagItem[];
  segments?: Segment[];
  translations?: TranslationDTO[];
  counters?: WorkspaceCounters;
};

/**
 * Per-language translation page. Mirrors workspace segment structure
 * but with language-specific text and independent NER spans.
 *
 * @category Types
 */
export type TranslationDTO = {
  language: string;
  text: string;
  sourceLang: string;
  createdAt: number;
  updatedAt: number;

  userSpans?: NerSpan[];
  apiSpans?: NerSpan[];
  deletedApiKeys?: string[];

  /** Translated strings keyed by original segment ID */
  segmentTranslations?: {
    [segmentId: string]: string;
  };
  /** Tracks which segment translations were manually edited */
  editedSegmentTranslations?: {
    [segmentId: string]: boolean;
  };
};