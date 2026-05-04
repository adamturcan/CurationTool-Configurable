/**
 * Singleton provider for ConfigService — picks BrowserConfigService (env-var defaults) or RemoteConfigService (server-fetched config) based on `VITE_BACKEND_URL`.
 * Production code calls `getConfigService()`; tests can substitute an implementation via `setConfigProviderOverrides` and reset via `resetConfigProvider`.
 * RemoteConfigService falls back to env-var defaults on fetch failure (HTTP 500, network error, malformed payload), so the consumer never sees an exception during config read.
 * The non-obvious detail is that the same singleton is reused across the session — server-side config changes after first load are not picked up unless `resetConfigProvider` is called.
 *
 * @category Infrastructure
 */
import { BrowserConfigService } from '../services/BrowserConfigService';
import { RemoteConfigService } from '../services/RemoteConfigService';
import { getAuthService } from './authProvider';
import type { ConfigService } from '../../core/interfaces/ConfigService';

export interface ConfigProviderOverrides {
  configService?: ConfigService;
}

let configServiceSingleton: ConfigService | null = null;
let overrides: ConfigProviderOverrides | null = null;

export function setConfigProviderOverrides(next: ConfigProviderOverrides): void {
  overrides = next;
  if (next.configService) {
    configServiceSingleton = null;
  }
}

export function resetConfigProvider(): void {
  overrides = null;
  configServiceSingleton = null;
}

function createDefaultConfigService(): ConfigService {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  return backendUrl
    ? new RemoteConfigService(backendUrl, () => getAuthService().getToken())
    : new BrowserConfigService();
}

export function getConfigService(): ConfigService {
  if (overrides?.configService) {
    return overrides.configService;
  }

  if (!configServiceSingleton) {
    configServiceSingleton = createDefaultConfigService();
  }

  return configServiceSingleton;
}
