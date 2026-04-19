import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RemoteConfigService } from '../infrastructure/services/RemoteConfigService';
import type { ApiEndpointConfig } from '../core/interfaces/ConfigService';

const BACKEND_URL = 'https://api.example.com';
const serverEndpoints: ApiEndpointConfig[] = [
  { name: 'NER', key: 'ner', url: 'https://custom-ner.example.com/recognize' },
  { name: 'Segmentation', key: 'segment', url: 'https://custom-seg.example.com/segment' },
];

function createService(getToken: () => string | null = () => 'test-token') {
  return new RemoteConfigService(BACKEND_URL, getToken);
}

beforeEach(() => { vi.restoreAllMocks(); });

describe('RemoteConfigService', () => {
  it('fetches config from server, caches endpoints, and marks ready', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ endpoints: serverEndpoints }), { status: 200 }),
    );

    const service = createService();
    expect(service.isReady()).toBe(false);

    const config = await service.fetchConfig();
    expect(config.endpoints).toEqual(serverEndpoints);
    expect(service.getEndpoints()).toEqual(serverEndpoints);
    expect(service.getEndpoint('ner')?.url).toBe('https://custom-ner.example.com/recognize');
    expect(service.isReady()).toBe(true);
  });

  it('sends auth token and strips trailing slash from URL', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ endpoints: serverEndpoints }), { status: 200 }),
    );

    const service = new RemoteConfigService('https://api.example.com/', () => 'my-jwt');
    await service.fetchConfig();

    expect(spy).toHaveBeenCalledWith(
      'https://api.example.com/api/config',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer my-jwt' }) }),
    );
  });

  it('falls back to env-var defaults on error (500, network, malformed)', async () => {
    for (const mockFn of [
      () => vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('Error', { status: 500 })),
      () => vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error')),
      () => vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ wrong: 'shape' }), { status: 200 })),
    ]) {
      mockFn();
      const service = createService();
      const config = await service.fetchConfig();
      expect(config.endpoints.length).toBe(5);
      expect(service.isReady()).toBe(true);
    }
  });

  it('deduplicates concurrent fetchConfig calls', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ endpoints: serverEndpoints }), { status: 200 }),
    );

    const service = createService();
    await Promise.all([service.fetchConfig(), service.fetchConfig(), service.fetchConfig()]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('saveConfig PUTs to server and updates cache', async () => {
    const updated: ApiEndpointConfig[] = [{ name: 'NER', key: 'ner', url: 'https://new.example.com' }];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ endpoints: updated }), { status: 200 }),
    );

    const service = createService();
    await service.saveConfig({ endpoints: updated });
    expect(service.getEndpoints()).toEqual(updated);
  });

  it('saveConfig throws on non-200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));
    await expect(createService().saveConfig({ endpoints: [] })).rejects.toThrow('Failed to save config (HTTP 403)');
  });
});
