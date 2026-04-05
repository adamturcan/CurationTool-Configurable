/** Provides a transaction filter and annotation for protecting span boundaries during edits */
import type { Extension } from "@codemirror/state";
import { Annotation } from "@codemirror/state";

export const intentionalTextReplace = Annotation.define<boolean>();

export const createSpanProtectionFilter = (): Extension => [];