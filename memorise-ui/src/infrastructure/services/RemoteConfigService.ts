import type { ConfigService, ApiEndpointConfig, AppConfig } from '../../core/interfaces/ConfigService';
import { BrowserConfigService } from './BrowserConfigService';

/**
 * Fetches app-wide config from the backend API, falls back to env vars on failure.
 * Used when VITE_BACKEND_URL is set.
 *
 * Expected backend API:
 * - GET  /api/config → { endpoints: ApiEndpointConfig[] }
 * - PUT  /api/config → { endpoints: ApiEndpointConfig[] }  (admin only)
 *
 * @category Infrastructure
 */
export class RemoteConfigService implements ConfigService {
  private readonly backendUrl: string;
  private readonly getAuthToken: () => string | null;
  private readonly fallback: BrowserConfigService;

  private cachedEndpoints: ApiEndpointConfig[] | null = null;
  private ready = false;
  private fetchPromise: Promise<AppConfig> | null = null;

  constructor(backendUrl: string, getAuthToken: () => string | null) {
    this.backendUrl = backendUrl.replace(/\/$/, '');
    this.getAuthToken = getAuthToken;
    this.fallback = new BrowserConfigService();
  }

  getEndpoints(): ApiEndpointConfig[] {
    return this.cachedEndpoints
      ? [...this.cachedEndpoints]
      : this.fallback.getEndpoints();
  }

  getEndpoint(key: string): ApiEndpointConfig | null {
    const endpoints = this.cachedEndpoints ?? this.fallback.getEndpoints();
    return endpoints.find((ep) => ep.key === key) ?? null;
  }

  async fetchConfig(): Promise<AppConfig> {
    // Dedup concurrent calls
    if (this.fetchPromise) return this.fetchPromise;

    this.fetchPromise = this.doFetch();

    try {
      return await this.fetchPromise;
    } finally {
      this.fetchPromise = null;
    }
  }

  async saveConfig(config: AppConfig): Promise<void> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.backendUrl}/api/config`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const msg = await response.text().catch(() => '');
      throw new Error(`Failed to save config (HTTP ${response.status})${msg ? `: ${msg}` : ''}`);
    }

    // Update local cache with what the server accepted
    const data = (await response.json()) as { endpoints?: unknown };
    if (Array.isArray(data.endpoints)) {
      this.cachedEndpoints = data.endpoints as ApiEndpointConfig[];
    } else {
      this.cachedEndpoints = config.endpoints;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  private async doFetch(): Promise<AppConfig> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.backendUrl}/api/config`, { headers });

      if (!response.ok) {
        console.warn(`Config fetch failed (HTTP ${response.status}), using env var fallback`);
        return this.useFallback();
      }

      const data = (await response.json()) as { endpoints?: unknown };

      if (!Array.isArray(data.endpoints)) {
        console.warn('Config response malformed (missing endpoints array), using env var fallback');
        return this.useFallback();
      }

      this.cachedEndpoints = data.endpoints as ApiEndpointConfig[];
      this.ready = true;
      return { endpoints: [...this.cachedEndpoints] };
    } catch (error) {
      console.warn('Config fetch error, using env var fallback:', error);
      return this.useFallback();
    }
  }

  private useFallback(): AppConfig {
    this.ready = true;
    const config = { endpoints: this.fallback.getEndpoints() };
    return config;
  }
}
