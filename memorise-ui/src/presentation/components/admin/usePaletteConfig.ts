import { useCallback, useEffect, useState } from "react";
import { getConfigService } from "../../../infrastructure/providers/configProvider";
import { useAuthStore } from "../../stores";
import type { EntityColor } from "../../../core/interfaces/ConfigService";

/**
 * Mirror of {@link useEndpointConfig} for the entity color palette slice.
 * Owns the load + edit/save lifecycle for the palette section of the admin panel
 * Keeps the concerns separate from endpoint configuration so the two tables can be edited independently.
 *
 * On successful save we trigger a hard reload so every consumer of `ENTITY_COLORS` (CodeMirror theme, segment chips, dialogs) picks up the new colors.
 */

type EntryDraft = { key: string; color: string };

export interface UsePaletteConfig {
  /** Palette loaded from the config service, in display order. */
  palette: EntityColor[];
  /** True while the initial fetch is running. */
  loading: boolean;
  /** True once the palette has been loaded (success or fallback). */
  ready: boolean;
  /** True when VITE_BACKEND_URL is set (server mode), false in standalone. */
  isServerMode: boolean;
  /** True when the user is allowed to edit (admin in server mode). */
  canEdit: boolean;

  /** True while the panel is in edit mode. */
  editing: boolean;
  /** Working draft list, reflects all in-progress edits, additions and deletions. */
  draft: EntryDraft[];
  /** True while a save request is in flight. */
  saving: boolean;
  /** Last save error message, or null on success / no save attempt. */
  saveError: string | null;
  /** True if the draft differs from the saved palette. */
  hasChanges: boolean;
  /** Per-row validation message, keyed by draft index. */
  rowErrors: Record<number, string>;

  /** Enter edit mode, copies the current palette into the draft. */
  startEditing: () => void;
  /** Discard the draft and leave edit mode. */
  cancelEditing: () => void;
  /** Persist the draft via the config service. Reloads the page on success. */
  save: () => Promise<void>;

  /** Update one draft entry's key. */
  setDraftKey: (index: number, key: string) => void;
  /** Update one draft entry's color. */
  setDraftColor: (index: number, color: string) => void;
  /** Remove a draft entry. */
  removeDraftEntry: (index: number) => void;
  /** Append a blank entry at the end of the draft. */
  addDraftEntry: () => void;
}

const KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/** Returns null when the draft passes client-side checks, otherwise an index→message map. */
function validateDraft(draft: EntryDraft[]): Record<number, string> {
  const errors: Record<number, string> = {};
  const seen = new Map<string, number>();

  for (let i = 0; i < draft.length; i++) {
    const { key, color } = draft[i];
    const trimmedKey = key.trim();

    if (trimmedKey.length === 0) {
      errors[i] = "Key required";
    } else if (!KEY_PATTERN.test(trimmedKey)) {
      errors[i] = "Key must match A-Z, 0-9, _";
    } else if (seen.has(trimmedKey)) {
      errors[i] = `Duplicate key (also at row ${(seen.get(trimmedKey) ?? 0) + 1})`;
    } else if (!HEX_PATTERN.test(color)) {
      errors[i] = "Color must be #RRGGBB";
    }

    if (!errors[i]) seen.set(trimmedKey, i);
  }

  return errors;
}

export function usePaletteConfig(): UsePaletteConfig {
  const [palette, setPalette] = useState<EntityColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EntryDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isServerMode = !!import.meta.env.VITE_BACKEND_URL;
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const canEdit = isServerMode && isAdmin;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const config = await getConfigService().fetchConfig();
        if (cancelled) return;
        setPalette(config.palette);
      } catch {
        if (!cancelled) setPalette(getConfigService().getPalette());
      } finally {
        if (!cancelled) {
          setReady(true);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const startEditing = useCallback(() => {
    setDraft(palette.map((entry) => ({ ...entry })));
    setSaveError(null);
    setEditing(true);
  }, [palette]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setDraft([]);
    setSaveError(null);
  }, []);

  const save = useCallback(async () => {
    const errors = validateDraft(draft);
    if (Object.keys(errors).length > 0) {
      setSaveError("Fix highlighted rows before saving");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const payload: EntityColor[] = draft.map(({ key, color }) => ({ key: key.trim(), color }));

    try {
      await getConfigService().saveConfig({ palette: payload });
      // Hard reload so every consumer of ENTITY_COLORS rebinds to the new palette.    
      window.location.reload();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }, [draft]);

  const setDraftKey = useCallback((index: number, key: string) => {
    setDraft((prev) => prev.map((entry, i) => (i === index ? { ...entry, key } : entry)));
  }, []);

  const setDraftColor = useCallback((index: number, color: string) => {
    setDraft((prev) => prev.map((entry, i) => (i === index ? { ...entry, color } : entry)));
  }, []);

  const removeDraftEntry = useCallback((index: number) => {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addDraftEntry = useCallback(() => {
    setDraft((prev) => [...prev, { key: "", color: "#94A3B8" }]);
  }, []);

  const rowErrors = editing ? validateDraft(draft) : {};

  const hasChanges =
    editing &&
    (draft.length !== palette.length ||
      draft.some((entry, i) => entry.key !== palette[i]?.key || entry.color !== palette[i]?.color));

  return {
    palette,
    loading,
    ready,
    isServerMode,
    canEdit,
    editing,
    draft,
    saving,
    saveError,
    hasChanges,
    rowErrors,
    startEditing,
    cancelEditing,
    save,
    setDraftKey,
    setDraftColor,
    removeDraftEntry,
    addDraftEntry,
  };
}
