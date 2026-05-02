import type { NerSpan, Segment, ClassificationResult, TranslationRequest, TranslationResponse, SupportedLanguage } from '../types.js';

/**
 * Contract for a pluggable NLP backend.
 * Adapters provide the actual NER, segmentation, classification and translation logic - either by calling an external service (SDU) or by returning mock responses.
 * They are registered in an `AdapterRegistry` and resolved per request by `serviceType` and `key`.
 */

/** Optional self-description of an adapter's request and response shapes. */
export interface AdapterSchema {
  request: unknown;
  response: unknown;
}

/**
 * Base shape implemented by every adapter.
 * `key` is the lookup id
 * `serviceType` is the capability
 * `call` is the entry point invoked by the route handler.
 */
export interface NlpAdapter<TRequest = unknown, TResponse = unknown> {
  readonly key: string;
  readonly name: string;
  readonly serviceType: string;
  readonly schema?: AdapterSchema;
  call(request: TRequest, endpointUrl: string): Promise<TResponse>;
}

/** Adapter that produces named-entity spans for a text. */
export interface NerAdapter extends NlpAdapter<{ text: string }, NerSpan[]> {
  readonly serviceType: 'ner';
}

/** Adapter that splits text into ordered segments. */
export interface SegmentAdapter extends NlpAdapter<{ text: string }, Segment[]> {
  readonly serviceType: 'segment';
}

/** Adapter that returns classification labels for a text. */
export interface ClassifyAdapter extends NlpAdapter<{ text: string }, ClassificationResult[]> {
  readonly serviceType: 'classify';
}

/** Adapter that translates text and reports the languages it supports. */
export interface TranslateAdapter extends NlpAdapter<TranslationRequest, TranslationResponse> {
  readonly serviceType: 'translate';
  getSupportedLanguages(endpointUrl: string): Promise<SupportedLanguage[]>;
}
