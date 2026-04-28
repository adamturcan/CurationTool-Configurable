import type { NerSpan, Segment, ClassificationResult, TranslationRequest, TranslationResponse, LanguageCode } from '../types.js';

export interface AdapterSchema {
  request: unknown;
  response: unknown;
}

export interface NlpAdapter<TRequest = unknown, TResponse = unknown> {
  readonly key: string;
  readonly name: string;
  readonly serviceType: string;
  readonly schema?: AdapterSchema;
  call(request: TRequest, endpointUrl: string): Promise<TResponse>;
}

export interface NerAdapter extends NlpAdapter<{ text: string }, NerSpan[]> {
  readonly serviceType: 'ner';
}

export interface SegmentAdapter extends NlpAdapter<{ text: string }, Segment[]> {
  readonly serviceType: 'segment';
}

export interface ClassifyAdapter extends NlpAdapter<{ text: string }, ClassificationResult[]> {
  readonly serviceType: 'classify';
}

export interface TranslateAdapter extends NlpAdapter<TranslationRequest, TranslationResponse> {
  readonly serviceType: 'translate';
  getSupportedLanguages(endpointUrl: string): Promise<LanguageCode[]>;
}
