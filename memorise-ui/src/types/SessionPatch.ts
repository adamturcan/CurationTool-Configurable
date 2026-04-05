import type { Segment } from "./Segment";
import type { TranslationDTO } from "./Workspace";

/** Partial workspace update — only the changed fields are sent to the store/repository */
export interface SessionPatch {
    segments?: Segment[];
    translations?: TranslationDTO[];
    text?: string;
}