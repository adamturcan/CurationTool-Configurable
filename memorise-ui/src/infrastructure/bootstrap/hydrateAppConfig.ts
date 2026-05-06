/**
 * One-shot bootstrap: pulls AppConfig (endpoints + palette) from the configured ConfigService and applies the palette slice to the runtime map in `shared/constants/notationEditor`.
 *
 * Called once at app startup, before the editor renders.
 * Failure is non-fatal: ConfigService falls back to defaults internally and we keep the frozen `DEFAULT_ENTITY_PALETTE` already loaded into the runtime map.
 *
 * Endpoint hydration is owned by `useEndpointConfig` (admin panel) because it also drives health checks - keeping the two concerns separate.
 *
 * @category Infrastructure
 */
import { getConfigService } from "../providers/configProvider";
import { setEntityPalette } from "../../shared/constants/notationEditor";

let hydratePromise: Promise<void> | null = null;

/** Subsequent calls return the in-flight promise. */
export function hydrateAppConfig(): Promise<void> {
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    try {
      const config = await getConfigService().fetchConfig();
      setEntityPalette(config.palette);
    } catch (error) {
      console.warn("[bootstrap] Failed to hydrate app config; keeping default palette", error);
    }
  })();

  return hydratePromise;
}

/** Clears the cached promise so the next call re-runs hydration. */
export function resetAppConfigHydration(): void {
  hydratePromise = null;
}
