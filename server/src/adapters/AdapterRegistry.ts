import type { NlpAdapter } from './NlpAdapter.js';

/**
 * In-memory registry of NLP adapters, keyed by service type and adapter key.
 * Populated at startup and used to resolve the adapter for each NLP request.
 */
export class AdapterRegistry {
  private adapters: Map<string, Map<string, NlpAdapter>> = new Map();

  /** Adds an adapter under its service type.
   * Replaces any existing entry with the same key. */
  register(serviceType: string, adapter: NlpAdapter): void {
    if (!this.adapters.has(serviceType)) {
      this.adapters.set(serviceType, new Map());
    }
    this.adapters.get(serviceType)!.set(adapter.key, adapter);
  }

  /** Returns the adapter for the given service and key, or `null` if none is registered. */
  get(serviceType: string, adapterKey: string): NlpAdapter | null {
    return this.adapters.get(serviceType)?.get(adapterKey) ?? null;
  }

  /** Lists the adapters registered for a service, exposing only their public fields. */
  listForService(serviceType: string): { key: string; name: string; schema?: { request: unknown; response: unknown } }[] {
    const map = this.adapters.get(serviceType);
    if (!map) return [];
    return Array.from(map.values()).map(a => ({ key: a.key, name: a.name, schema: a.schema }));
  }

  /** Returns the first registered adapter for a service, used as a fallback when no key is given. */
  getDefault(serviceType: string): NlpAdapter | null {
    const map = this.adapters.get(serviceType);
    if (!map || map.size === 0) return null;
    return map.values().next().value ?? null;
  }
}
