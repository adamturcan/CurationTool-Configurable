import type { NlpAdapter } from './NlpAdapter.js';

export class AdapterRegistry {
  private adapters: Map<string, Map<string, NlpAdapter>> = new Map();

  register(serviceType: string, adapter: NlpAdapter): void {
    if (!this.adapters.has(serviceType)) {
      this.adapters.set(serviceType, new Map());
    }
    this.adapters.get(serviceType)!.set(adapter.key, adapter);
  }

  get(serviceType: string, adapterKey: string): NlpAdapter | null {
    return this.adapters.get(serviceType)?.get(adapterKey) ?? null;
  }

  listForService(serviceType: string): { key: string; name: string; schema?: { request: unknown; response: unknown } }[] {
    const map = this.adapters.get(serviceType);
    if (!map) return [];
    return Array.from(map.values()).map(a => ({ key: a.key, name: a.name, schema: a.schema }));
  }

  getDefault(serviceType: string): NlpAdapter | null {
    const map = this.adapters.get(serviceType);
    if (!map || map.size === 0) return null;
    return map.values().next().value ?? null;
  }
}
