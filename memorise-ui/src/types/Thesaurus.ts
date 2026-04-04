/** Flattened index item for fast searching — stored in the pre-processed index file */
export type ThesaurusIndexItem = {
  id: number;
  label: string;
  labelLower: string;            // Pre-lowercased for fast search
  parentId: number;
  parentLabel: string;
  rootCategory: string;
  path: string[];                // Array of labels from root to this node
  pathString: string;            // Pre-joined for display: "culture › writing › Jewish publications"
  depth: number;                 // 0 = root, 1 = child, 2 = grandchild, etc.
  isPreferred: boolean;
};

/** Simplified item for the autocomplete UI in TagThesaurusInput */
export type ThesaurusItem = {
  name: string;
  path?: string[];               // Hierarchical path for display
  keywordId?: number;            // Reference to original keyword
  isPreferred?: boolean;         // Show badge if not preferred
  depth?: number;                // For visual indentation
};



