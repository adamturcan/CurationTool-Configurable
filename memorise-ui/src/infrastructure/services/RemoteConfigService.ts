import type { ConfigService, ApiEndpointConfig, AppConfig, EntityColor } from '../../core/interfaces/ConfigService';
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
  private cachedPalette: EntityColor[] | null = null;
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

  getPalette(): EntityColor[] {
    return this.cachedPalette
      ? this.cachedPalette.map((entry) => ({ ...entry }))
      : this.fallback.getPalette();
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

  async saveConfig(config: Partial<AppConfig>): Promise<void> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const body: Partial<AppConfig> = {};
    if (config.endpoints !== undefined) body.endpoints = config.endpoints;
    if (config.palette !== undefined) body.palette = config.palette;

    const response = await fetch(`${this.backendUrl}/api/config`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const msg = await response.text().catch(() => '');
      throw new Error(`Failed to save config (HTTP ${response.status})${msg ? `: ${msg}` : ''}`);
    }

    // Update local cache with what the server accepted
    const data = (await response.json()) as { endpoints?: unknown; palette?: unknown };
    if (Array.isArray(data.endpoints)) {
      this.cachedEndpoints = data.endpoints as ApiEndpointConfig[];
    } else if (config.endpoints !== undefined) {
      this.cachedEndpoints = config.endpoints;
    }
    if (Array.isArray(data.palette)) {
      this.cachedPalette = data.palette as EntityColor[];
    } else if (config.palette !== undefined) {
      this.cachedPalette = config.palette;
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

      const data = (await response.json()) as { endpoints?: unknown; palette?: unknown };

      if (!Array.isArray(data.endpoints)) {
        console.warn('Config response malformed (missing endpoints array), using env var fallback');
        return this.useFallback();
      }

      this.cachedEndpoints = data.endpoints as ApiEndpointConfig[];
      this.cachedPalette = Array.isArray(data.palette)
        ? (data.palette as EntityColor[])
        : this.fallback.getPalette();
      this.ready = true;
      return {
        endpoints: [...this.cachedEndpoints],
        palette: this.cachedPalette.map((entry) => ({ ...entry })),
      };
    } catch (error) {
      console.warn('Config fetch error, using env var fallback:', error);
      return this.useFallback();
    }
  }

  private useFallback(): AppConfig {
    this.ready = true;
    return {
      endpoints: this.fallback.getEndpoints(),
      palette: this.fallback.getPalette(),
    };
  }
}
