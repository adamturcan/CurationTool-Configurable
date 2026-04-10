import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RemoteConfigService } from '@/infrastructure/services/RemoteConfigService';
import type { ApiEndpointConfig } from '@/core/interfaces/ConfigService';

const BACKEND_URL = 'https://api.example.com';

const serverEndpoints: ApiEndpointConfig[] = [
  { name: 'NER', key: 'ner', url: 'https://custom-ner.example.com/recognize' },
  { name: 'Segmentation', key: 'segment', url: 'https://custom-seg.example.com/segment' },
];

function createService(getToken: () => string | null = () => 'test-token') {
  return new RemoteConfigService(BACKEND_URL, getToken);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RemoteConfigService', () => {
  it('fetches config from server and caches endpoints', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ endpoints: serverEndpoints }), { status: 200 }),
    );

    const service = createService();
    const config = await service.fetchConfig();

    expect(config.endpoints).toEqual(serverEndpoints);
    expect(service.getEndpoints()).toEqual(serverEndpoints);
    expect(service.isReady()).toBe(true);
  });

  it('sends auth token in Authorization header', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ endpoints: serverEndpoints }), { status: 200 }),
    );

    const service = createService(() => 'my-jwt-token');
    await service.fetchConfig();

    expect(fetchSpy).toHaveBeenCalledWith(
      `${BACKEND_URL}/api/config`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-jwt-token',
        }),
      }),
    );
  });

  it('falls back to env vars on non-200 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 }),
    );

    const service = createService();
    const config = await service.fetchConfig();

    // Should get default SDU endpoints from BrowserConfigService fallback
    expect(config.endpoints.length).toBe(4);
    expect(config.endpoints.map(ep => ep.key)).toEqual(['ner', 'segment', 'classify', 'translate']);
    expect(service.isReady()).toBe(true);
  });

  it('falls back to env vars on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const service = createService();
    const config = await service.fetchConfig();

    expect(config.endpoints.length).toBe(4);
    expect(service.isReady()).toBe(true);
  });

  it('falls back on malformed response (missing endpoints array)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ wrong: 'shape' }), { status: 200 }),
    );

    const service = createService();
    const config = await service.fetchConfig();

    expect(config.endpoints.length).toBe(4);
    expect(service.isReady()).toBe(true);
  });

  it('deduplicates concurrent fetchConfig calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ endpoints: serverEndpoints }), { status: 200 }),
    );

    const service = createService();
    const [r1, r2, r3] = await Promise.all([
      service.fetchConfig(),
      service.fetchConfig(),
      service.fetchConfig(),
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(r1.endpoints).toEqual(r2.endpoints);
    expect(r2.endpoints).toEqual(r3.endpoints);
  });

  it('getEndpoints returns fallback before fetch', () => {
    const service = createService();

    // Before any fetch, should return env-var based defaults
    const endpoints = service.getEndpoints();
    expect(endpoints.length).toBe(4);
    expect(endpoints.map(ep => ep.key)).toEqual(['ner', 'segment', 'classify', 'translate']);
    expect(service.isReady()).toBe(false);
  });

  it('getEndpoints returns server data after fetch', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ endpoints: serverEndpoints }), { status: 200 }),
    );

    const service = createService();
    await service.fetchConfig();

    expect(service.getEndpoints()).toEqual(serverEndpoints);
  });

  it('getEndpoint finds by key after fetch', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ endpoints: serverEndpoints }), { status: 200 }),
    );

    const service = createService();
    await service.fetchConfig();

    expect(service.getEndpoint('ner')?.url).toBe('https://custom-ner.example.com/recognize');
    expect(service.getEndpoint('nonexistent')).toBeNull();
  });

  it('getEndpoints returns a defensive copy', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ endpoints: serverEndpoints }), { status: 200 }),
    );

    const service = createService();
    await service.fetchConfig();

    const first = service.getEndpoints();
    first.pop();
    expect(service.getEndpoints()).toHaveLength(serverEndpoints.length);
  });

  it('omits Authorization header when no token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ endpoints: serverEndpoints }), { status: 200 }),
    );

    const service = createService(() => null);
    await service.fetchConfig();

    const headers = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('strips trailing slash from backend URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ endpoints: serverEndpoints }), { status: 200 }),
    );

    const service = new RemoteConfigService('https://api.example.com/', () => null);
    await service.fetchConfig();

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/api/config',
      expect.anything(),
    );
  });

  // saveConfig tests

  it('saveConfig PUTs endpoints to server and updates cache', async () => {
    const updatedEndpoints: ApiEndpointConfig[] = [
      { name: 'NER', key: 'ner', url: 'https://new-ner.example.com/recognize' },
    ];

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ endpoints: updatedEndpoints }), { status: 200 }),
    );

    const service = createService();
    await service.saveConfig({ endpoints: updatedEndpoints });

    expect(fetchSpy).toHaveBeenCalledWith(
      `${BACKEND_URL}/api/config`,
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
        body: JSON.stringify({ endpoints: updatedEndpoints }),
      }),
    );

    // Cache should be updated
    expect(service.getEndpoints()).toEqual(updatedEndpoints);
  });

  it('saveConfig throws on non-200 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Forbidden', { status: 403 }),
    );

    const service = createService();
    await expect(service.saveConfig({ endpoints: [] }))
      .rejects.toThrow('Failed to save config (HTTP 403)');
  });

  it('saveConfig falls back to input endpoints when response has no endpoints array', async () => {
    const input: ApiEndpointConfig[] = [
      { name: 'NER', key: 'ner', url: 'https://new-ner.example.com' },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const service = createService();
    await service.saveConfig({ endpoints: input });

    expect(service.getEndpoints()).toEqual(input);
  });
});
