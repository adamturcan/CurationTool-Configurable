/** Web Worker that loads the thesaurus index and runs Fuse.js fuzzy searches off the main thread. */

import Fuse from 'fuse.js';
import type { ThesaurusIndexItem } from '../types';

let fuse: Fuse<ThesaurusIndexItem> | null = null;
let isReady = false;

/**
 * Initialize: Load and index thesaurus on worker startup
 */
(async () => {
  try {
    const pathsToTry = [
      '/NPRG045/thesaurus-index.json',  // Production base
      '/thesaurus-index.json',          // Dev/no base
      './thesaurus-index.json',         // Relative
    ];
    
    let response: Response | null = null;
    
    // Try each path until one works
    for (const path of pathsToTry) {
      try {
        const res = await fetch(path);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          response = res;
          break;
        }
      } catch {
        continue;
      }
    }
    
    if (!response) {
      throw new Error('Could not load thesaurus-index.json from any path');
    }

    const index: ThesaurusIndexItem[] = await response.json();
    if (!Array.isArray(index) || index.length === 0) {
      throw new Error('Invalid index format: expected non-empty array');
    }
    // Initialize Fuse.js for fuzzy search
    fuse = new Fuse(index, {
      keys: [
        { name: 'labelLower', weight: 3 },      // Primary: match on label
        { name: 'pathString', weight: 1 },      // Secondary: match in path
      ],
      threshold: 0.3,                           // Fuzzy tolerance (0 = exact, 1 = match anything)
      ignoreLocation: true,                     // Match anywhere in string
      minMatchCharLength: 2,                    // Minimum query length
      shouldSort: true,                         // Sort by relevance
      includeScore: true,                       // For debugging
    });
    
    isReady = true;
    self.postMessage({ type: 'READY' });
    
  } catch (error) {
    console.error('[ThesaurusWorker] Failed to load:', error instanceof Error ? error.message : error);
    self.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error)
    });
  }
})();

/**
 * Message handler: Process search requests
 */
self.onmessage = (e: MessageEvent) => {
  const { type, query, limit = 20 } = e.data;
  
  if (type === 'SEARCH') {
    // Not ready yet
    if (!isReady || !fuse) {
      self.postMessage({ type: 'RESULTS', results: [] });
      return;
    }
    
    // Empty or too short query
    if (!query || query.trim().length < 2) {
      self.postMessage({ type: 'RESULTS', results: [] });
      return;
    }
    
    // Perform fuzzy search
    const searchResults = fuse.search(query.toLowerCase(), { limit });
    
    // Extract items from Fuse results
    const results = searchResults.map(r => r.item);
    
    // Send results back to main thread
    self.postMessage({ type: 'RESULTS', results });
  }
};

