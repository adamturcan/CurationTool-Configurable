/**
 * Singleton provider for ApiService — picks BrowserApiService (standalone build) or BackendProxyApiService (server build) based on `VITE_BACKEND_URL`.
 * Production code calls `getApiService()`; tests can substitute an implementation via `setApiProviderOverrides` and reset back via `resetApiProvider`.
 * The override path is checked first on every `getApiService()` call, so swapping in a fake mid-test takes effect immediately for the next consumer call.
 * The non-obvious detail is that setting an override clears the cached singleton — the next default-path call will re-create from environment, not return the previously cached production service.
 *
 * @category Infrastructure
 */
import { BrowserApiService } from '../services/BrowserApiService';
import { BackendProxyApiService } from '../services/BackendProxyApiService';
import { getAuthService } from './authProvider';
import type { ApiService } from '../../core/interfaces/ApiService';

export interface ApiProviderOverrides {
  apiService?: ApiService;
}

let apiServiceSingleton: ApiService | null = null;
let overrides: ApiProviderOverrides | null = null;

/**
 * Substitutes the singleton ApiService used by the rest of the app — used in tests to inject a fake without touching real endpoints.
 *
 * @example
 * import { setApiProviderOverrides, resetApiProvider } from '@/infrastructure/providers/apiProvider';
 * import type { ApiService } from '@/core/interfaces/ApiService';
 *
 * const fake: ApiService = {
 *   segmentText: async () => [],
 *   classify: async () => [{ name: 'history', label: 1 }],
 *   ner: async () => [{ start: 0, end: 5, entity: 'PER' }],
 *   translate: async () => ({ translatedText: 'Hola', sourceLang: 'en' }),
 *   getSupportedLanguages: async () => [{ code: 'es', name: 'Spanish' }],
 * };
 *
 * beforeEach(() => setApiProviderOverrides({ apiService: fake }));
 * afterEach(() => resetApiProvider());
 */
export function setApiProviderOverrides(next: ApiProviderOverrides): void {
  overrides = next;
  if (next.apiService) {
    apiServiceSingleton = null;
  }
}

export function resetApiProvider(): void {
  overrides = null;
  apiServiceSingleton = null;
}

function createDefaultApiService(): ApiService {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  return backendUrl
    ? new BackendProxyApiService(backendUrl, () => getAuthService().getToken())
    : new BrowserApiService();
}

export function getApiService(): ApiService {
  if (overrides?.apiService) {
    return overrides.apiService;
  }

  if (!apiServiceSingleton) {
    apiServiceSingleton = createDefaultApiService();
  }

  return apiServiceSingleton;
}


