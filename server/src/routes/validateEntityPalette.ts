/**
 * Server-side validation for the entity color palette payload.
 * Mirrors the structure of `validateWorkspaceDto`: returns `null` when the payload is acceptable, otherwise a human-readable error string suitable for a 400 response.
 *
 * Allows arbitrary entity keys (admin can add custom domains) and an empty palette (the client falls back to a single neutral color when a key is missing).
 */

const KEY_MAX = 50;
const KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function validateEntityPalette(body: unknown): string | null {
  if (!Array.isArray(body)) return 'palette must be an array';

  const seen = new Set<string>();

  for (const entry of body) {
    if (!isPlainObject(entry)) return 'palette: each entry must be an object';

    const { key, color } = entry;
    if (typeof key !== 'string' || key.length === 0) return 'palette: key must be a non-empty string';
    if (key.length > KEY_MAX) return `palette: key must be at most ${KEY_MAX} characters`;
    if (!KEY_PATTERN.test(key)) return 'palette: key must match /^[A-Z][A-Z0-9_]*$/';
    if (seen.has(key)) return `palette: duplicate key "${key}"`;
    seen.add(key);

    if (typeof color !== 'string') return 'palette: color must be a string';
    if (!HEX_PATTERN.test(color)) return `palette: color for "${key}" must be a hex color (#RRGGBB)`;
  }

  return null;
}
