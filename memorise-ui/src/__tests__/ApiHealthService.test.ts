import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiHealthService } from '../infrastructure/services/ApiHealthService';
import type { ApiEndpointConfig } from '../core/interfaces/ConfigService';

const endpoint: ApiEndpointConfig = { name: 'Test API', key: 'test', url: 'https://api.example.com/test' };

beforeEach(() => { vi.restoreAllMocks(); });

describe('ApiHealthService', () => {
  it('reports "up" for 200 and reachable 4xx, "down" for 500', async () => {
    const service = new ApiHealthService();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    expect((await service.checkEndpoint(endpoint)).status).toBe('up');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }));
    expect((await service.checkEndpoint(endpoint)).status).toBe('up');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const down = await service.checkEndpoint(endpoint);
    expect(down.status).toBe('down');
    expect(down.error).toBe('HTTP 500');
  });

  it('reports "down" on network error and timeout', async () => {
    const service = new ApiHealthService();

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect((await service.checkEndpoint(endpoint)).error).toBe('Failed to fetch');

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')));
    expect((await service.checkEndpoint(endpoint)).error).toBe('Timeout');
  });

  it('checkAll returns results for all endpoints', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));

    const service = new ApiHealthService();
    const results = await service.checkAll([
      { name: 'A', key: 'a', url: 'https://a.com' },
      { name: 'B', key: 'b', url: 'https://b.com' },
    ]);

    expect(results).toHaveLength(2);
    expect(results.every(r => r.status === 'up')).toBe(true);
  });
});
