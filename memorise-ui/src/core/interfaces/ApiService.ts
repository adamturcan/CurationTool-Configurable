import type { NerSpan, TranslationRequest, TranslationResponse, Segment, SupportedLanguage } from '../../types';

/**
 * Contract for external NLP API calls.
 * Implemented by `BrowserApiService` (calls the NLP services directly from the browser, used in standalone mode)
 * Implemented by `BackendProxyApiService` (calls the backend, which forwards to the configured services, used in server mode).
 *
 * @category Interfaces
 */
export interface ApiService {
  /** Split text into sentence-level segments via the segmentation API */
  segmentText(text: string): Promise<Segment[]>;
  /** Classify text for semantic tagging. The shape is intentionally `unknown` here, the workflow service narrows it. */
  classify(text: string): Promise<unknown>;
  /** Run Named Entity Recognition, returns normalized spans */
  ner(text: string): Promise<NerSpan[]>;
  /** Translate text between languages */
  translate(params: TranslationRequest): Promise<TranslationResponse>;
  /** Retrieve supported translation languages*/
  getSupportedLanguages(): Promise<SupportedLanguage[]>;
}


