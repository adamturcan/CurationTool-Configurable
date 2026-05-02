/** NER entity colors, category list, and hex-to-rgba helper for the notation editor. */

/** visible entity colors */
export const ENTITY_COLORS: Record<string, string> = {
  // Holocaust-domain (project home corpus)
  PER: "#C2185B",         // Person (magenta)
  PERS: "#C2185B",        // Person - SDU alias
  PERSON: "#C2185B",      // Person - legal-mock alias
  DATE: "#1976D2",        // Date (blue)
  LOC: "#388E3C",         // Location (green)
  ORG: "#F57C00",         // Organization (orange)
  CAMP: "#6A1B9A",        // Camp (purple)
  GHETTO: "#5D4037",      // Ghetto (brown)
  MISC: "#607D8B",        // Miscellaneous (blue-grey)
  // Legal-domain (legal-mock-sdu)
  LAW: "#00838F",         // Statute / case law (deep cyan)
  // Medical-domain (medical-mock-clinical)
  DISEASE: "#D32F2F",     // Disease / condition (red)
  MEDICATION: "#FBC02D",  // Medication (amber)
  ANATOMY: "#5E35B1",     // Anatomical structure (deep purple)
  PROCEDURE: "#3949AB",   // Clinical procedure (indigo)
} as const;

/** fixed category list for the quick-add / edit menu */
export const CATEGORY_LIST = ["PER", "LOC", "GHETTO", "DATE", "ORG", "CAMP"] as const;


/** Convert a hex color string to an rgba() CSS value. */
export const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace("#", "");
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
