/**
 * Singleton provider for ConfigService. Supports DI overrides for testing.
 * Production code uses getConfigService().
 *
 * @category Infrastructure
 */
import { BrowserConfigService } from '../services/BrowserConfigService';
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

export function getConfigService(): ConfigService {
  if (overrides?.configService) {
    return overrides.configService;
  }

  if (!configServiceSingleton) {
    configServiceSingleton = new BrowserConfigService();
  }

  return configServiceSingleton;
}
