/**
 * Centralized thesaurus index paths, tried in order.
 * Used by both the main-thread loader and the Web Worker.
 */
export const THESAURUS_INDEX_PATHS = [
  '/DataCurationTool/thesaurus-index.json',
  '/thesaurus-index.json',
  './thesaurus-index.json',
];
