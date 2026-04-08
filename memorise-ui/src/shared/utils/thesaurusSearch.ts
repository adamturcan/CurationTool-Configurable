import type { ThesaurusIndexItem } from '../../types';

/**
 * Find a tag in the thesaurus.
 *
 * Matching priority:
 * 1. By KeywordID + ParentID (if both provided) — most accurate, disambiguates duplicates
 * 2. By KeywordID only (if provided) — accurate for unique IDs
 * 3. By exact label match (case-insensitive) — prefer preferred terms over aliases
 */
export function findInThesaurus(
  tag: { name: string; keywordId?: number; parentId?: number },
  index: ThesaurusIndexItem[]
): ThesaurusIndexItem | null {
  if (tag.keywordId !== undefined && tag.parentId !== undefined) {
    const exact = index.find(
      item => item.id === tag.keywordId && item.parentId === tag.parentId
    );
    if (exact) return exact;
  }

  if (tag.keywordId !== undefined) {
    const matches = index.filter(item => item.id === tag.keywordId);
    if (matches.length > 1) {
      const preferred = matches.find(item => item.isPreferred);
      if (preferred) return preferred;
    }
    if (matches.length > 0) return matches[0];
  }

  const lower = tag.name.toLowerCase().trim();
  const matches = index.filter(item => item.labelLower === lower);

  if (matches.length === 0) return null;

  if (matches.length > 1) {
    const preferred = matches.find(item => item.isPreferred);
    if (preferred) return preferred;
  }

  return matches[0];
}
