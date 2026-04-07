import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiHealthService } from '@/infrastructure/services/ApiHealthService';
import type { ApiEndpointConfig } from '@/core/interfaces/ConfigService';

const endpoint: ApiEndpointConfig = {
  name: 'Test API',
  key: 'test',
  url: 'https://api.example.com/test',
};

describe('ApiHealthService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('reports "up" for successful response (200)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    }));

    const service = new ApiHealthService();
    const result = await service.checkEndpoint(endpoint);

    expect(result.status).toBe('up');
    expect(result.httpStatus).toBe(200);
    expect(result.latencyMs).toBeTypeOf('number');
    expect(result.error).toBeNull();
    expect(result.key).toBe('test');
    expect(result.name).toBe('Test API');
  });

  it('reports "up" for client error (400) — server is reachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
    }));

    const service = new ApiHealthService();
    const result = await service.checkEndpoint(endpoint);

    expect(result.status).toBe('up');
    expect(result.httpStatus).toBe(400);
    expect(result.error).toBe('HTTP 400');
  });

  it('reports "up" for 422 — server is reachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
    }));

    const service = new ApiHealthService();
    const result = await service.checkEndpoint(endpoint);

    expect(result.status).toBe('up');
    expect(result.httpStatus).toBe(422);
  });

  it('reports "down" for server error (500)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    const service = new ApiHealthService();
    const result = await service.checkEndpoint(endpoint);

    expect(result.status).toBe('down');
    expect(result.httpStatus).toBe(500);
    expect(result.error).toBe('HTTP 500');
  });

  it('reports "down" on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
      new TypeError('Failed to fetch')
    ));

    const service = new ApiHealthService();
    const result = await service.checkEndpoint(endpoint);

    expect(result.status).toBe('down');
    expect(result.httpStatus).toBeNull();
    expect(result.error).toBe('Failed to fetch');
    expect(result.latencyMs).toBeTypeOf('number');
  });

  it('reports "down" with "Timeout" on abort', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    const service = new ApiHealthService();
    const result = await service.checkEndpoint(endpoint);

    expect(result.status).toBe('down');
    expect(result.error).toBe('Timeout');
    expect(result.latencyMs).toBeNull();
  });

  it('checkAll returns results for all endpoints', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    }));

    const endpoints: ApiEndpointConfig[] = [
      { name: 'A', key: 'a', url: 'https://a.com' },
      { name: 'B', key: 'b', url: 'https://b.com' },
      { name: 'C', key: 'c', url: 'https://c.com' },
    ];

    const service = new ApiHealthService();
    const results = await service.checkAll(endpoints);

    expect(results).toHaveLength(3);
    expect(results.map((r) => r.key)).toEqual(['a', 'b', 'c']);
    expect(results.every((r) => r.status === 'up')).toBe(true);
  });

  it('records checkedAt timestamp', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    }));

    const before = Date.now();
    const service = new ApiHealthService();
    const result = await service.checkEndpoint(endpoint);

    expect(result.checkedAt).toBeGreaterThanOrEqual(before);
    expect(result.checkedAt).toBeLessThanOrEqual(Date.now());
  });
});
