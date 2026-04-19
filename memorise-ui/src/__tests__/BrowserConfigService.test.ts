import { describe, it, expect } from 'vitest';
import { BrowserConfigService } from '../infrastructure/services/BrowserConfigService';

describe('BrowserConfigService', () => {
  it('returns all endpoints with default SDU URLs', () => {
    const service = new BrowserConfigService();
    const endpoints = service.getEndpoints();

    expect(endpoints.map(ep => ep.key)).toEqual(['ner', 'segment', 'classify', 'translate', 'translate-languages']);
    expect(service.getEndpoint('ner')?.url).toContain('ner-api.dev.memorise.sdu.dk');
  });

  it('getEndpoint returns null for unknown key', () => {
    const service = new BrowserConfigService();
    expect(service.getEndpoint('nonexistent')).toBeNull();
  });

  it('isReady returns true (synchronous config)', () => {
    expect(new BrowserConfigService().isReady()).toBe(true);
  });
});
