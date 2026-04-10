import type { ConfigService, ApiEndpointConfig, AppConfig } from '../../core/interfaces/ConfigService';

/**
 * Reads API endpoint configuration from Vite env vars (import.meta.env).
 * Provides structured access to NER, segmentation, classification, and
 * translation API URLs with SDU defaults as fallback.
 *
 * @category Infrastructure
 */
export class BrowserConfigService implements ConfigService {
  private readonly endpoints: ApiEndpointConfig[];

  constructor() {
    this.endpoints = [
      {
        name: "Named Entity Recognition",
        key: "ner",
        url: import.meta.env.VITE_NER_API_URL
          ?? "https://ner-api.dev.memorise.sdu.dk/recognize",
      },
      {
        name: "Text Segmentation",
        key: "segment",
        url: import.meta.env.VITE_SEGMENT_API_URL
          ?? "https://textseg-api.dev.memorise.sdu.dk/segment",
      },
      {
        name: "Semantic Classification",
        key: "classify",
        url: import.meta.env.VITE_CLASSIFY_API_URL
          ?? "https://semtag-api.dev.memorise.sdu.dk/classify",
      },
      {
        name: "Machine Translation",
        key: "translate",
        url: (import.meta.env.VITE_TRANSLATION_API_URL
          ?? "https://mt-api.dev.memorise.sdu.dk").replace(/\/$/, ""),
      },
    ];
  }

  getEndpoints(): ApiEndpointConfig[] {
    return [...this.endpoints];
  }

  getEndpoint(key: string): ApiEndpointConfig | null {
    return this.endpoints.find((ep) => ep.key === key) ?? null;
  }

  async fetchConfig(): Promise<AppConfig> {
    return { endpoints: this.getEndpoints() };
  }

  async saveConfig(): Promise<void> {
    // No-op in standalone mode — endpoints come from env vars
  }

  isReady(): boolean {
    return true;
  }
}
