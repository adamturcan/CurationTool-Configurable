import { EditorView } from "@codemirror/view";
import { ENTITY_COLORS, hexToRgba } from "../../../../../shared/constants/notationEditor";

const baseThemeStyles: Record<string, Record<string, string>> = {
  "&": {
    height: "100%",
    fontSize: "15px",
    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  ".cm-scroller": { overflow: "auto", height: "100%", backgroundColor: "#ffffff" },
  ".cm-content": { padding: "24px 32px", color: "#1a1a1a", lineHeight: "1.6" },
  
  // Span styles
  "& .cm-ner-span": {
    borderRadius: "3px",
    padding: "2px 0px",
    position: "relative",
    transition: "background-color 0.2s ease, filter 0.2s ease",
  },
  "& .cm-ner-span:hover": { cursor: "pointer", filter: "brightness(0.85)" },

  // Instant entity tooltip (native `title` has a ~1-3s browser delay)
  "& .cm-ner-span[data-entity]:not([data-entity='']):hover::after": {
    content: "attr(data-entity)",
    position: "absolute", bottom: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)",
    padding: "2px 6px", fontSize: "11px", color: "#fff",
    background: "rgba(17,24,39,0.92)", borderRadius: "3px",
    whiteSpace: "nowrap", pointerEvents: "none", zIndex: "1000", filter: "none",
  },
  
  // Segment Highlight
  "& .cm-active-segment-highlight": {
    backgroundColor: "rgba(253, 224, 71, 0.4)",
    borderRadius: "2px",
    transition: "background-color 0.2s ease",
  },

  // Segment Borders
  "& .cm-segment-border-space": {
    backgroundColor: "#cbd5e1",
    borderRadius: "2px",
    transition: "background-color 0.2s ease",
  },
  "& .cm-segment-border-space:hover": {
    backgroundColor: "#3b82f6",
    cursor: "pointer",
  },
  
  // Segment Boundary Widget
  "& .cm-segment-boundary-widget": {
    display: "inline-block",
    width: "4px",
    height: "1.2em",
    backgroundColor: "#cbd5e1", 
    margin: "0 2px",
    verticalAlign: "middle",
    borderRadius: "2px",
  }
};

// Dynamically generate entity colors
Object.entries(ENTITY_COLORS).forEach(([entity, hexColor]) => {
  const className = `& .entity-${entity.toLowerCase()}`;
  baseThemeStyles[className] = {
    backgroundColor: hexToRgba(hexColor, 0.2),
    borderBottom: `2px solid ${hexColor}`,
  };
});

/** CodeMirror base theme defining editor layout and NER entity color styles */
export const editorTheme = EditorView.baseTheme(baseThemeStyles);