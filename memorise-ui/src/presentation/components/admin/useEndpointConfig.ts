import { useCallback, useEffect, useState } from "react";
import { getConfigService } from "../../../infrastructure/providers/configProvider";
import { getAuthService } from "../../../infrastructure/providers/authProvider";
import { getApiHealthService } from "../../../infrastructure/providers/apiHealthProvider";
import { useAuthStore } from "../../stores";
import type { ApiEndpointConfig } from "../../../core/interfaces/ConfigService";
import type { HealthCheckResult } from "../../../infrastructure/services/ApiHealthService";
import type { AdapterOption } from "./types";

/** Return shape: read state, mode flags, and edit-mode lifecycle. */
export interface UseEndpointConfig {
  /** Endpoints loaded from the config service. */
  endpoints: ApiEndpointConfig[];
  /** Latest health-check result for each endpoint. */
  results: HealthCheckResult[];
  /** True while the initial config + first health check are running. */
  loading: boolean;
  /** True once endpoints have been loaded (success or fallback). */
  configReady: boolean;
  /** Adapter options per endpoint key, fetched from the backend. */
  availableAdapters: Record<string, AdapterOption[]>;
  /** True when VITE_BACKEND_URL is set (server mode), false in standalone. */
  isServerMode: boolean;
  /** Trailing-slash-stripped backend URL, or empty string in standalone. */
  backendUrl: string;
  /** True when the user is allowed to edit (admin in server mode). */
  canEdit: boolean;
  /** Re-runs health checks against the current endpoint list. */
  refresh: () => Promise<void>;

  /** True while the panel is in edit mode. */
  editing: boolean;
  /** Draft URL per endpoint key, populated on `startEditing`. */
  editedUrls: Record<string, string>;
  /** Draft adapter per endpoint key, populated on `startEditing`. */
  editedAdapters: Record<string, string>;
  /** True while a save request is in flight. */
  saving: boolean;
  /** Last save error message, or null on success / no save attempt. */
  saveError: string | null;
  /** True if any draft URL or adapter differs from the saved value. */
  hasChanges: boolean;
  /** Enter edit mode; copies current URLs/adapters into the draft maps. */
  startEditing: () => Promise<void>;
  /** Discard drafts and leave edit mode without saving. */
  cancelEditing: () => void;
  /** Persist drafts via the config service, then re-run health checks. */
  save: () => Promise<void>;
  /** Update one draft URL by endpoint key. */
  setEditedUrl: (key: string, url: string) => void;
  /** Update one draft adapter by endpoint key. */
  setEditedAdapter: (key: string, adapter: string) => void;
}

/** Loads endpoints + adapters, runs health checks, and drives edit/save flow. */
export function useEndpointConfig(): UseEndpointConfig {
  const [endpoints, setEndpoints] = useState<ApiEndpointConfig[]>([]);
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [configReady, setConfigReady] = useState(false);
  const [availableAdapters, setAvailableAdapters] = useState<Record<string, AdapterOption[]>>({});

  const [editing, setEditing] = useState(false);
  const [editedUrls, setEditedUrls] = useState<Record<string, string>>({});
  const [editedAdapters, setEditedAdapters] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isServerMode = !!import.meta.env.VITE_BACKEND_URL;
  const backendUrl = (import.meta.env.VITE_BACKEND_URL ?? '').replace(/\/$/, '');
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const canEdit = isServerMode && isAdmin;

  /** Builds the Authorization header from the current auth token, if any. */
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    const token = getAuthService().getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  /** Runs health checks: server-proxied in server mode, in-browser otherwise. */
  const runChecks = useCallback(async (eps: ApiEndpointConfig[]) => {
    setResults(
      eps.map((ep) => ({
        key: ep.key,
        name: ep.name,
        url: ep.url,
        status: "checking" as const,
        latencyMs: null,
        httpStatus: null,
        error: null,
        checkedAt: Date.now(),
      }))
    );

    if (isServerMode) {
      try {
        const response = await fetch(`${backendUrl}/api/health`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ endpoints: eps.map((ep) => ({ key: ep.key, name: ep.name, url: ep.url })) }),
        });
        if (response.ok) {
          const checked = await response.json();
          setResults(checked);
          return;
        }
      } catch {
        // Fall through to client-side checks
      }
    }

    const checked = await getApiHealthService().checkAll(eps);
    setResults(checked);
  }, [isServerMode, backendUrl]);

  /** Loads adapter options per endpoint from the backend (server mode only). */
  const fetchAvailableAdapters = useCallback(async () => {
    if (!isServerMode) return;
    try {
      const response = await fetch(`${backendUrl}/api/adapters`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json() as Record<string, AdapterOption[]>;
        setAvailableAdapters(data);
      }
    } catch {
      // Adapter list not critical
    }
  }, [isServerMode, backendUrl]);

  useEffect(() => {
    let cancelled = false;
    void fetchAvailableAdapters();

    (async () => {
      try {
        const config = await getConfigService().fetchConfig();
        if (cancelled) return;
        setEndpoints(config.endpoints);
        setConfigReady(true);
        setLoading(false);
        await runChecks(config.endpoints);
      } catch {
        if (!cancelled) {
          const eps = getConfigService().getEndpoints();
          setEndpoints(eps);
          setConfigReady(true);
          setLoading(false);
          await runChecks(eps);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [runChecks, fetchAvailableAdapters]);

  /** Re-runs health checks against the current endpoint list. */
  const refresh = useCallback(async () => {
    await runChecks(endpoints);
  }, [runChecks, endpoints]);

  /** Snapshots current URLs/adapters into draft maps and enters edit mode. */
  const startEditing = async () => {
    const urlMap: Record<string, string> = {};
    const adapterMap: Record<string, string> = {};
    for (const ep of endpoints) {
      urlMap[ep.key] = ep.url;
      adapterMap[ep.key] = ep.adapter ?? '';
    }
    setEditedUrls(urlMap);
    setEditedAdapters(adapterMap);
    setSaveError(null);
    setEditing(true);
    await fetchAvailableAdapters();
  };

  /** Discards drafts and leaves edit mode. */
  const cancelEditing = () => {
    setEditing(false);
    setEditedUrls({});
    setEditedAdapters({});
    setSaveError(null);
  };

  /** Persists drafts via the config service and re-runs health checks on success. */
  const save = async () => {
    setSaving(true);
    setSaveError(null);

    const updated = endpoints.map((ep) => ({
      ...ep,
      url: editedUrls[ep.key] ?? ep.url,
      adapter: editedAdapters[ep.key] || ep.adapter,
    }));

    try {
      await getConfigService().saveConfig({ endpoints: updated });
      setEndpoints(updated);
      setEditing(false);
      setEditedUrls({});
      setEditedAdapters({});
      await runChecks(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = endpoints.some(
    (ep) =>
      (editedUrls[ep.key] !== undefined && editedUrls[ep.key] !== ep.url) ||
      (editedAdapters[ep.key] !== undefined && editedAdapters[ep.key] !== (ep.adapter ?? ''))
  );

  /** Updates one draft URL by endpoint key. */
  const setEditedUrl = (key: string, url: string) => {
    setEditedUrls((prev) => ({ ...prev, [key]: url }));
  };

  /** Updates one draft adapter by endpoint key. */
  const setEditedAdapter = (key: string, adapter: string) => {
    setEditedAdapters((prev) => ({ ...prev, [key]: adapter }));
  };

  return {
    endpoints,
    results,
    loading,
    configReady,
    availableAdapters,
    isServerMode,
    backendUrl,
    canEdit,
    refresh,
    editing,
    editedUrls,
    editedAdapters,
    saving,
    saveError,
    hasChanges,
    startEditing,
    cancelEditing,
    save,
    setEditedUrl,
    setEditedAdapter,
  };
}
