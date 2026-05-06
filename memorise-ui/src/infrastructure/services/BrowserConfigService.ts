import type { ConfigService, ApiEndpointConfig, AppConfig, EntityColor } from '../../core/interfaces/ConfigService';
import { DEFAULT_ENTITY_PALETTE } from '../../shared/constants/notationEditor';

/**
 * Reads API endpoint configuration from Vite env vars (import.meta.env).
 * Provides structured access to NER, segmentation, classification, and translation API URLs with SDU defaults as fallback.
 *
 * @category Infrastructure
 */
export class BrowserConfigService implements ConfigService {
  private readonly endpoints: ApiEndpointConfig[];
  private readonly palette: EntityColor[];

  constructor() {
    this.palette = Object.entries(DEFAULT_ENTITY_PALETTE).map(([key, color]) => ({ key, color }));
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
        url: import.meta.env.VITE_TRANSLATION_API_URL
          ?? "https://mt-api.dev.memorise.sdu.dk/translate",
      },
      {
        name: "Supported Languages",
        key: "translate-languages",
        url: import.meta.env.VITE_TRANSLATION_LANGUAGES_URL
          ?? "https://mt-api.dev.memorise.sdu.dk/supported_languages",
      },
    ];
  }

  getEndpoints(): ApiEndpointConfig[] {
    return [...this.endpoints];
  }

  getEndpoint(key: string): ApiEndpointConfig | null {
    return this.endpoints.find((ep) => ep.key === key) ?? null;
  }

  getPalette(): EntityColor[] {
    return this.palette.map((entry) => ({ ...entry }));
  }

  async fetchConfig(): Promise<AppConfig> {
    return { endpoints: this.getEndpoints(), palette: this.getPalette() };
  }

  async saveConfig(): Promise<void> {
    // No-op in standalone mode - config comes from env vars and frozen defaults
  }

  isReady(): boolean {
    return true;
  }
}
