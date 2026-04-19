/**
 * Centralized thesaurus index paths, tried in order.
 * If VITE_THESAURUS_URL is set, it is used first.
 * Used by both the main-thread loader and the Web Worker.
 */
export const THESAURUS_INDEX_PATHS: string[] = [
  ...(import.meta.env.VITE_THESAURUS_URL ? [import.meta.env.VITE_THESAURUS_URL] : []),
  '/DataCurationTool/thesaurus-index.json',
  '/thesaurus-index.json',
  './thesaurus-index.json',
];
