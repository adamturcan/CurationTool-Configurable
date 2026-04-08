import type { ThesaurusIndexItem } from '../../types';
import type { TagRow } from '../../presentation/components/rightPanel/RightPanel';
import { findInThesaurus } from './thesaurusSearch';

/** Hierarchy node for tree structure. */
export type HierarchyNode = {
  label: string;
  tags: TagRow[];
  children: Map<string, HierarchyNode>;
  depth: number;
  fullPath: string[];
  rootCategory: string;
};

/** Build hierarchy tree from tags using thesaurus index. */
export function buildTagHierarchy(
  tags: TagRow[],
  thesaurusIndex: ThesaurusIndexItem[]
): Map<string, HierarchyNode> {
  const rootMap = new Map<string, HierarchyNode>();

  for (const tag of tags) {
    const shouldLookupThesaurus =
      tag.source === "api" ||
      (tag.keywordId !== undefined);

    let thesaurusEntry: ThesaurusIndexItem | null = null;

    if (shouldLookupThesaurus) {
      thesaurusEntry = findInThesaurus(tag, thesaurusIndex);
    }

    if (!thesaurusEntry) {
      if (!rootMap.has('Other')) {
        rootMap.set('Other', {
          label: 'Other',
          tags: [],
          children: new Map(),
          depth: 0,
          fullPath: ['Other'],
          rootCategory: 'Other',
        });
      }
      rootMap.get('Other')!.tags.push(tag);
      continue;
    }

    const path = thesaurusEntry.path;
    const rootCategory = path[0];

    if (!rootMap.has(rootCategory)) {
      rootMap.set(rootCategory, {
        label: rootCategory,
        tags: [],
        children: new Map(),
        depth: 0,
        fullPath: [rootCategory],
        rootCategory: thesaurusEntry.rootCategory,
      });
    }

    let current = rootMap.get(rootCategory)!;

    for (let i = 1; i < path.length - 1; i++) {
      const segment = path[i];

      if (!current.children.has(segment)) {
        current.children.set(segment, {
          label: segment,
          tags: [],
          children: new Map(),
          depth: i,
          fullPath: path.slice(0, i + 1),
          rootCategory,
        });
      }

      current = current.children.get(segment)!;
    }

    current.tags.push(tag);
  }

  return rootMap;
}

/** Count all tags in a node and its descendants (recursive). */
export function countAllTags(node: HierarchyNode): number {
  let count = node.tags.length;
  for (const child of node.children.values()) {
    count += countAllTags(child);
  }
  return count;
}
