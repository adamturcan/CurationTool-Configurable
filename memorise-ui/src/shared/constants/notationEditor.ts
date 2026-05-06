/** NER entity colors, category list, and hex-to-rgba helper for the notation editor. */

import type { EntityColor } from "../../core/interfaces/ConfigService";

/**
 * Single neutral color used when an entity has no palette entry (key was deleted by an admin, or the corpus contains an unknown tag).
 */
export const FALLBACK_ENTITY_COLOR = "#94A3B8";

/**
 * Frozen default palette - Holocaust-domain entities only.
 * Used as the initial state before `fetchConfig` resolves and as the fallback when the standalone build runs without a server.
 * Platform-mode admins can extend this through the PaletteEditor, the server seed carries additional entries for the bundled medical/legal mock adapters.
 */
export const DEFAULT_ENTITY_PALETTE: Readonly<Record<string, string>> = Object.freeze({
  PER: "#C2185B",
  DATE: "#1976D2",
  LOC: "#388E3C",
  ORG: "#F57C00",
  CAMP: "#6A1B9A",
  GHETTO: "#5D4037",
  MISC: "#607D8B",
});

/**
 * Aliases that always resolve to a canonical entity's color.
 * The palette only stores canonical keys (PER)
 * Aliases are derived atlookup time so admins don't see duplicates in the editor.
 */
const ALIASES: Readonly<Record<string, string>> = Object.freeze({
  PERS: "PER",
  PERSON: "PER",
});

/** Mutable runtime map. Replaced wholesale by `setEntityPalette`. */
const runtimePalette = new Map<string, string>(Object.entries(DEFAULT_ENTITY_PALETTE));

/**
 * Resolves an entity color, applying alias mapping and the neutral fallback.
 * This is the canonical accessor. New code should call this directly.
 */
export function getEntityColor(key: string): string {
  const canonical = ALIASES[key] ?? key;
  return runtimePalette.get(canonical) ?? FALLBACK_ENTITY_COLOR;
}

/**
 * Replaces the runtime palette atomically.
 * Called once at app bootstrap from the fetched config and again after an admin saves the palette. Iteration order of `ENTITY_COLORS` is the insertion order of `palette`.
 */
export function setEntityPalette(palette: ReadonlyArray<EntityColor>): void {
  runtimePalette.clear();
  for (const { key, color } of palette) {
    runtimePalette.set(key, color);
  }
}

/**
 * Snapshot of the current palette as `EntityColor[]`, in iteration order.
 * Useful for UI consumers that need a list (admin editor, color legends).
 */
export function getEntityPalette(): EntityColor[] {
  return Array.from(runtimePalette, ([key, color]) => ({ key, color }));
}

/**
 * Backward-compatible record-style accessor used by ~50 call sites.
 * Reads (`ENTITY_COLORS.DATE`, `ENTITY_COLORS[key]`) delegate to `getEntityColor`, so they automatically reflect runtime updates and fall back to `FALLBACK_ENTITY_COLOR` for missing keys.
 *
 * `Object.entries(ENTITY_COLORS)` (used by the CodeMirror theme) is supported through the `ownKeys` / `getOwnPropertyDescriptor` traps.
 *
 * Writes are not allowed - mutations must go through `setEntityPalette`.
 */
export const ENTITY_COLORS: Record<string, string> = new Proxy({} as Record<string, string>, {
  get: (_target, prop) => {
    if (typeof prop !== "string") return undefined;
    return getEntityColor(prop);
  },
  has: (_target, prop) => typeof prop === "string" && runtimePalette.has(ALIASES[prop] ?? prop),
  ownKeys: () => Array.from(runtimePalette.keys()),
  getOwnPropertyDescriptor: (_target, prop) => {
    if (typeof prop !== "string") return undefined;
    if (!runtimePalette.has(prop)) return undefined;
    return { configurable: true, enumerable: true, writable: false, value: runtimePalette.get(prop) };
  },
  set: () => {
    throw new Error("ENTITY_COLORS is read-only. Use setEntityPalette() instead.");
  },
  deleteProperty: () => {
    throw new Error("ENTITY_COLORS is read-only. Use setEntityPalette() instead.");
  },
});

/** Convert a hex color string to an rgba() CSS value. */
export const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace("#", "");
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
