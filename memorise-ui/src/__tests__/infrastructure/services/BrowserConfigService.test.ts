import { describe, it, expect } from 'vitest';
import { BrowserConfigService } from '@/infrastructure/services/BrowserConfigService';

describe('BrowserConfigService', () => {
  it('returns all 4 endpoints', () => {
    const service = new BrowserConfigService();
    const endpoints = service.getEndpoints();

    expect(endpoints).toHaveLength(4);
    expect(endpoints.map((ep) => ep.key)).toEqual([
      'ner',
      'segment',
      'classify',
      'translate',
    ]);
  });

  it('each endpoint has name, key, and url', () => {
    const service = new BrowserConfigService();
    for (const ep of service.getEndpoints()) {
      expect(ep.name).toBeTruthy();
      expect(ep.key).toBeTruthy();
      expect(ep.url).toBeTruthy();
    }
  });

  it('returns default SDU URLs when env vars are not set', () => {
    const service = new BrowserConfigService();
    const ner = service.getEndpoint('ner');
    expect(ner?.url).toContain('ner-api.dev.memorise.sdu.dk');
  });

  it('getEndpoint returns matching config by key', () => {
    const service = new BrowserConfigService();

    const ner = service.getEndpoint('ner');
    expect(ner).not.toBeNull();
    expect(ner?.key).toBe('ner');
    expect(ner?.name).toBe('Named Entity Recognition');

    const translate = service.getEndpoint('translate');
    expect(translate).not.toBeNull();
    expect(translate?.key).toBe('translate');
  });

  it('getEndpoint returns null for unknown key', () => {
    const service = new BrowserConfigService();
    expect(service.getEndpoint('nonexistent')).toBeNull();
  });

  it('getEndpoints returns a defensive copy', () => {
    const service = new BrowserConfigService();
    const first = service.getEndpoints();
    first.pop();

    const second = service.getEndpoints();
    expect(second).toHaveLength(4);
  });
});
