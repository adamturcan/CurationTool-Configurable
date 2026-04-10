/**
 * Singleton provider for ConfigService. Supports DI overrides for testing.
 * Picks BrowserConfigService (standalone) or RemoteConfigService (server)
 * based on VITE_BACKEND_URL.
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
