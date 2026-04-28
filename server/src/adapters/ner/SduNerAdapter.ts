import type { NerAdapter, AdapterSchema } from '../NlpAdapter.js';
import type { NerSpan } from '../../types.js';

export class SduNerAdapter implements NerAdapter {
  readonly key = 'sdu-ner';
  readonly name = 'SDU NER Service';
  readonly serviceType = 'ner' as const;
  readonly schema: AdapterSchema = {
    request: { text: "Marie Curie was born in Warsaw." },
    response: { result: [{ type: "PER", name: "Marie Curie", start: 0, end: 11 }] },
  };

  async call(request: { text: string }, endpointUrl: string): Promise<NerSpan[]> {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: request.text }),
    });

    if (!response.ok) {
      throw new Error(`NER API error: HTTP ${response.status}`);
    }

    const result = await response.json() as { result?: unknown };
    const rawSpans = Array.isArray(result?.result) ? result.result : [];

    return rawSpans.map((span: { start: number; end: number; type: string; score?: number }) => ({
      start: span.start,
      end: span.end,
      entity: span.type,
      score: typeof span.score === 'number' ? span.score : 1,
    }));
  }
}
