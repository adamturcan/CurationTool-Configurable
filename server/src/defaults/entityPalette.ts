import type { EntityColor } from '../types.js';

/**
 * Seed entity palette used on first run in platform mode.
 * Includes the seven Holocaust-domain entities (which mirror the standalone client's DEFAULT_ENTITY_PALETTE) plus five extras (LAW, DISEASE, MEDICATION, ANATOMY, PROCEDURE) used by the bundled legal and medical mock adapters. Admins can trim or extend this through the PaletteEditor.
 *
 * Aliases (PERS, PERSON) are intentionally not included, the client maps them to PER at hydrate time so admins only see canonical entities.
 */
export const DEFAULT_ENTITY_PALETTE: EntityColor[] = [
  { key: 'PER', color: '#C2185B' },
  { key: 'DATE', color: '#1976D2' },
  { key: 'LOC', color: '#388E3C' },
  { key: 'ORG', color: '#F57C00' },
  { key: 'CAMP', color: '#6A1B9A' },
  { key: 'GHETTO', color: '#5D4037' },
  { key: 'MISC', color: '#607D8B' },
  { key: 'LAW', color: '#00838F' },
  { key: 'DISEASE', color: '#D32F2F' },
  { key: 'MEDICATION', color: '#FBC02D' },
  { key: 'ANATOMY', color: '#5E35B1' },
  { key: 'PROCEDURE', color: '#3949AB' },
];
