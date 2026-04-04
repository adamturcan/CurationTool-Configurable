import type { NerSpan } from "./NotationEditor";
import type { TagItem } from "./Tag";
import type { Segment } from "./Segment";

/**
 * Core workspace DTO persisted to localStorage.
 * Contains source text, NER spans (user vs API), segments, tags, and translations.
 *
 * @category Types
 */
export type Workspace = {
  id: string;
  name: string;
  isTemporary?: boolean;
  text?: string;
  /** Manually created spans — kept separate from apiSpans for conflict resolution */
  userSpans?: NerSpan[];
  apiSpans?: NerSpan[];
  /** API span IDs the user dismissed, so they don't reappear on re-run */
  deletedApiKeys?: string[];
  updatedAt?: number;
  owner?: string;

  tags?: TagItem[];
  segments?: Segment[];
  translations?: Translation[];
};

/**
 * Per-language translation page. Mirrors workspace segment structure
 * but with language-specific text and independent NER spans.
 *
 * @category Types
 */
export type Translation = {
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