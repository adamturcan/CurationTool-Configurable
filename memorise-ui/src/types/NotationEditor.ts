/**
 * A single NER annotation defined by character offsets within the text.
 * Entity types follow the categories in `notationEditor.ts` constants (PER, LOC, ORG, etc.).
 *
 * @category Types
 */
export type NerSpan = {
  id?: string;
  origin?: 'api' | 'user';
  /** Character offset where the span starts (0-based) */
  start: number;
  /** Character offset where the span ends (exclusive) */
  end: number;
  /** NER entity type (PER, LOC, ORG, DATE, CAMP, GHETTO, MISC) */
  entity: string;
  /** Confidence score from the NER API (0–1), undefined for user-created spans */
  score?: number;
};

/** Text selection position with screen coordinates for positioning context menus */
export type SelectionBox = {
  start: number;
  end: number;
  top: number;
  left: number;
};

/** Maps span IDs to their current character offsets — used for fast coordinate lookups */
export type SpanCoordMap = Map<string, { start: number; end: number }>;

/** Props for the entity category picker menu */
export interface CategoryMenuProps {
  anchorEl: HTMLElement | null;
  open?: boolean;
  onClose: () => void;
  onCategorySelect: (category: string) => void;
  onMouseDown?: (event: React.MouseEvent) => void;
  showDelete?: boolean;
  onDelete?: () => void;
}