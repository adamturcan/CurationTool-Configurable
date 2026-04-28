import { describe, it, expect } from 'vitest';

import { AdapterRegistry } from '../adapters/AdapterRegistry.js';
import type { NlpAdapter } from '../adapters/NlpAdapter.js';

const makeAdapter = (key: string, serviceType: string, name = key): NlpAdapter => ({
  key,
  name,
  serviceType,
  async call() {
    return null;
  },
});

describe('AdapterRegistry', () => {
  it('returns null when looking up an unregistered service type', () => {
    const registry = new AdapterRegistry();
    expect(registry.get('ner', 'sdu')).toBeNull();
    expect(registry.getDefault('ner')).toBeNull();
  });

  it('round-trips a registered adapter via get()', () => {
    const registry = new AdapterRegistry();
    const adapter = makeAdapter('sdu', 'ner');

    registry.register('ner', adapter);

    expect(registry.get('ner', 'sdu')).toBe(adapter);
    expect(registry.get('ner', 'unknown')).toBeNull();
  });

  it('returns the first registered adapter as the default for a service type', () => {
    const registry = new AdapterRegistry();
    const first = makeAdapter('sdu', 'ner');
    const second = makeAdapter('spacy', 'ner');

    registry.register('ner', first);
    registry.register('ner', second);

    expect(registry.getDefault('ner')).toBe(first);
  });

  it('lists every adapter registered under a service type', () => {
    const registry = new AdapterRegistry();
    registry.register('ner', makeAdapter('sdu', 'ner', 'SDU NER'));
    registry.register('ner', makeAdapter('spacy', 'ner', 'spaCy NER'));

    const listed = registry.listForService('ner');

    expect(listed).toHaveLength(2);
    expect(listed.map(a => a.key).sort()).toEqual(['sdu', 'spacy']);
    expect(listed.find(a => a.key === 'sdu')?.name).toBe('SDU NER');
  });

  it('replaces the existing adapter when re-registered under the same key', () => {
    const registry = new AdapterRegistry();
    const original = makeAdapter('sdu', 'ner', 'Original');
    const replacement = makeAdapter('sdu', 'ner', 'Replacement');

    registry.register('ner', original);
    registry.register('ner', replacement);

    expect(registry.get('ner', 'sdu')).toBe(replacement);
    expect(registry.listForService('ner')).toHaveLength(1);
  });

  it('isolates adapters across different service types', () => {
    const registry = new AdapterRegistry();
    const nerAdapter = makeAdapter('sdu', 'ner');
    const segmentAdapter = makeAdapter('sdu', 'segment');

    registry.register('ner', nerAdapter);
    registry.register('segment', segmentAdapter);

    expect(registry.get('ner', 'sdu')).toBe(nerAdapter);
    expect(registry.get('segment', 'sdu')).toBe(segmentAdapter);
    expect(registry.listForService('ner')).toHaveLength(1);
    expect(registry.listForService('translate')).toEqual([]);
  });
});
