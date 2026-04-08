import { useState, useEffect } from 'react';
import { loadThesaurusIndex } from '../../shared/utils/thesaurusLoader';
import type { ThesaurusIndexItem } from '../../types';
import type { useThesaurusWorker } from './useThesaurusWorker';

/** Loads the thesaurus index for display once the worker is ready */
export function useThesaurusDisplay(
  thesaurusWorker: ReturnType<typeof useThesaurusWorker>
): ThesaurusIndexItem[] | undefined {
  const [thesaurusIndexForDisplay, setThesaurusIndexForDisplay] = 
    useState<ThesaurusIndexItem[] | null>(null);

  useEffect(() => {
    if (thesaurusWorker.ready && !thesaurusIndexForDisplay) {
      loadThesaurusIndex()
        .then(setThesaurusIndexForDisplay)
        .catch(err => {
          console.error('Failed to load thesaurus for display:', err);
        });
    }
  }, [thesaurusWorker.ready, thesaurusIndexForDisplay]);

  return thesaurusIndexForDisplay || undefined;
}

