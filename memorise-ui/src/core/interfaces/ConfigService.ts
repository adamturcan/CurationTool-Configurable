/**
 * Describes a single API endpoint for health monitoring and configuration.
 *
 * @category Interfaces
 */
export interface ApiEndpointConfig {
  /** Human-readable name (e.g., "Named Entity Recognition") */
  name: string;
  /** Key identifier (e.g., "ner", "segment", "classify", "translate") */
  key: string;
  /** Full URL to the endpoint */
  url: string;
  /** Adapter key (e.g., "sdu-ner") — absent means default adapter */
  adapter?: string;
}

/**
 * App-wide configuration returned by the server or built from env vars.
 *
 * @category Interfaces
 */
export interface AppConfig {
  endpoints: ApiEndpointConfig[];
}

/**
 * Contract for reading API endpoint configuration.
 * Implemented by BrowserConfigService (env vars) and RemoteConfigService (server).
 *
 * @category Interfaces
 */
export interface ConfigService {
  /** Returns all configured API endpoints (cached/env-var data, always synchronous) */
  getEndpoints(): ApiEndpointConfig[];
  /** Returns a specific endpoint by key, or null if not configured */
  getEndpoint(key: string): ApiEndpointConfig | null;
  /** Fetches config from the source (env vars or server). Called once at app startup. */
  fetchConfig(): Promise<AppConfig>;
  /** Saves updated endpoint config. Server mode: PUT /api/config. Standalone: no-op. */
  saveConfig(config: AppConfig): Promise<void>;
  /** Whether async config has been resolved */
  isReady(): boolean;
}
