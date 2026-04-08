import type { ThesaurusIndexItem } from '../../types';
import { THESAURUS_INDEX_PATHS } from './thesaurusConfig';

let thesaurusCache: ThesaurusIndexItem[] | null = null;

/** Load thesaurus index into memory (called once, cached thereafter). */
export async function loadThesaurusIndex(): Promise<ThesaurusIndexItem[]> {
  if (thesaurusCache) return thesaurusCache;

  for (const path of THESAURUS_INDEX_PATHS) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        const data: ThesaurusIndexItem[] = await response.json();
        thesaurusCache = data;
        return data;
      }
    } catch {
      continue;
    }
  }

  throw new Error('Could not load thesaurus index');
}
