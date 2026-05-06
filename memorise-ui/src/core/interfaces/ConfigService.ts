/**
 * Describes a single API endpoint for health monitoring and configuration.
 *
 * @category Interfaces
 */
export interface ApiEndpointConfig {
  /** Human-readable name */
  name: string;
  /** Key identifier */
  key: string;
  /** Full URL to the endpoint */
  url: string;
  /** Adapter key - absent means default adapter */
  adapter?: string;
}

/**
 * One entry of the runtime entity color palette.
 * `key` is the entity tag (e.g. PER, LOC); `color` is a CSS hex (#RRGGBB).
 *
 * @category Interfaces
 */
export interface EntityColor {
  key: string;
  color: string;
}

/**
 * App-wide configuration returned by the server or built from env vars.
 *
 * @category Interfaces
 */
export interface AppConfig {
  endpoints: ApiEndpointConfig[];
  palette: EntityColor[];
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
  /** Returns the entity color palette (cached/default data, always synchronous). */
  getPalette(): EntityColor[];
  /** Fetches config from the source (env vars or server). Called once at app startup. */
  fetchConfig(): Promise<AppConfig>;
  /** Persists a partial app config slice. Server mode: PUT /api/config. Standalone: no-op. */
  saveConfig(config: Partial<AppConfig>): Promise<void>;
  /** Whether async config has been resolved */
  isReady(): boolean;
}
