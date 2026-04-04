/** Whether a tag was created by the user or returned by the classification API */
export type TagSource = "api" | "user";

/** Semantic tag attached to a span or the whole document, optionally linked to a thesaurus entry */
export interface TagItem {
  name: string;
  source: TagSource;
  label?: number;     // KeywordID from thesaurus (when from API classification)
  parentId?: number;  // ParentID to disambiguate entries with same KeywordID
  segmentId?: string; // Optional segment ID - if undefined, tag applies to whole document
}
