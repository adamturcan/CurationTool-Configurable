import { Decoration, type DecorationSet, EditorView } from "@codemirror/view";
import { type Range, StateField, Facet } from "@codemirror/state";
import type { NerSpan } from "../../../../../../types";
import { getSpanId } from "../../../utils/editorUtils";

/** Creates CodeMirror decorations for NER span highlighting and tracking */
export const spansFacet = Facet.define<NerSpan[], NerSpan[]>({
  combine: (values) => values[values.length - 1] || [],
});

const buildDecorations = (spans: NerSpan[], docLength: number) => {
  if (!spans || spans.length === 0) return Decoration.none;

  const marks: Range<Decoration>[] = [];
  for (const span of spans) {
    const start = Number(span.start);
    const end = Number(span.end);
    const id = getSpanId(span);

    if (!isNaN(start) && !isNaN(end) && start < end && start < docLength) {
      const safeEnd = Math.min(end, docLength);
      if (start < safeEnd) {
        const entityLabel = span.entity || "";
        marks.push(
          Decoration.mark({
            class: `cm-ner-span entity-${entityLabel.toLowerCase()}`,
            attributes: { "data-span-id": id, "data-entity": entityLabel },
          }).range(start, safeEnd)
        );
      }
    }
  }
  try { return Decoration.set(marks, true); } catch { return Decoration.none; }
};

export const spanDecorationField = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state.facet(spansFacet), state.doc.length);
  },
  update(decorations, tr) {
    const currentSpans = tr.state.facet(spansFacet);
    const oldSpans = tr.startState.facet(spansFacet);

    if (currentSpans !== oldSpans) return buildDecorations(currentSpans, tr.state.doc.length);

    let nextDecorations = decorations.map(tr.changes);
    const size = nextDecorations.size || 0;

    if (tr.docChanged && size === 0 && currentSpans.length > 0) {
      nextDecorations = buildDecorations(currentSpans, tr.state.doc.length);
    }
    return nextDecorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});