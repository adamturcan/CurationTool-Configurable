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
}

/**
 * Contract for reading API endpoint configuration.
 * Implemented by BrowserConfigService (reads from env vars).
 * Later PRs will extend with server-side config fetching.
 *
 * @category Interfaces
 */
export interface ConfigService {
  /** Returns all configured API endpoints */
  getEndpoints(): ApiEndpointConfig[];
  /** Returns a specific endpoint by key, or null if not configured */
  getEndpoint(key: string): ApiEndpointConfig | null;
}
