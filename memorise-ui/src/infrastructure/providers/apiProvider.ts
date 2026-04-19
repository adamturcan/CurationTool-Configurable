/**
 * Singleton provider for ApiService. Supports DI overrides for testing.
 * Picks BrowserApiService (standalone) or BackendProxyApiService (server)
 * based on VITE_BACKEND_URL.
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


