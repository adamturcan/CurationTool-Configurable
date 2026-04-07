import type { ApiEndpointConfig } from '../../core/interfaces/ConfigService';

/**
 * Result of a single endpoint health check.
 *
 * @category Infrastructure
 */
export interface HealthCheckResult {
  key: string;
  name: string;
  url: string;
  status: "up" | "down" | "checking";
  latencyMs: number | null;
  httpStatus: number | null;
  error: string | null;
  checkedAt: number;
}

/**
 * Pings API endpoints to determine health status and response latency.
 * Tries HEAD first (no body, minimal overhead). Any HTTP response — even
 * 405 or 4xx — proves the server is reachable and counts as "up".
 * Falls back to POST with empty body only if HEAD fails at the network level.
 *
 * @category Infrastructure
 */
export class ApiHealthService {
  private readonly timeoutMs: number;

  constructor(timeoutMs = 5000) {
    this.timeoutMs = timeoutMs;
  }

  async checkEndpoint(endpoint: ApiEndpointConfig): Promise<HealthCheckResult> {
    const start = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      // HEAD is the lightest probe — no request/response body.
      // If the server responds at all (even 405), it's reachable.
      let response: Response;
      try {
        response = await fetch(endpoint.url, {
          method: "HEAD",
          signal: controller.signal,
        });
      } catch {
        // HEAD may be blocked by CORS; fall back to POST with minimal body
        response = await fetch(endpoint.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "" }),
          signal: controller.signal,
        });
      }

      const latencyMs = Math.round(performance.now() - start);
      clearTimeout(timer);

      return {
        key: endpoint.key,
        name: endpoint.name,
        url: endpoint.url,
        status: response.status < 500 ? "up" : "down",
        latencyMs,
        httpStatus: response.status,
        error: response.ok ? null : `HTTP ${response.status}`,
        checkedAt: Date.now(),
      };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      clearTimeout(timer);

      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      return {
        key: endpoint.key,
        name: endpoint.name,
        url: endpoint.url,
        status: "down",
        latencyMs: isTimeout ? null : latencyMs,
        httpStatus: null,
        error: isTimeout ? "Timeout" : (err instanceof Error ? err.message : "Unknown error"),
        checkedAt: Date.now(),
      };
    }
  }

  async checkAll(endpoints: ApiEndpointConfig[]): Promise<HealthCheckResult[]> {
    return Promise.all(endpoints.map((ep) => this.checkEndpoint(ep)));
  }
}
