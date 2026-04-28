import type { NerAdapter, AdapterSchema } from '../NlpAdapter.js';
import type { NerSpan } from '../../types.js';

interface MedicalNerEntity {
  span: [number, number];
  text: string;
  codes?: { system: string; code: string }[];
  attributes?: Record<string, string>;
  confidence: number;
}

interface MedicalNerResponse {
  metadata?: { model?: string; version?: string };
  entities: Record<string, MedicalNerEntity[]>;
}

export class MockMedicalNerAdapter implements NerAdapter {
  readonly key = 'mock-medical';
  readonly name = 'Mock Medical (Comprehend-style)';
  readonly serviceType = 'ner' as const;
  readonly schema: AdapterSchema = {
    request: { text: 'Patient has type 2 diabetes; takes aspirin daily.' },
    response: {
      metadata: { model: 'mock-biobert-v1', version: '2026.04' },
      entities: {
        DISEASE: [{
          span: [12, 28],
          text: 'type 2 diabetes',
          codes: [{ system: 'ICD10', code: 'E11' }],
          confidence: 0.94,
        }],
        MEDICATION: [{
          span: [36, 43],
          text: 'aspirin',
          attributes: { dose: '81mg', frequency: 'daily', route: 'PO' },
          codes: [{ system: 'RxNorm', code: '1191' }],
          confidence: 0.97,
        }],
      },
    },
  };

  async call(request: { text: string }, endpointUrl: string): Promise<NerSpan[]> {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: request.text }),
    });

    if (!response.ok) {
      throw new Error(`Medical NER API error: HTTP ${response.status}`);
    }

    const data = await response.json() as MedicalNerResponse;
    if (!data || typeof data.entities !== 'object' || data.entities === null) return [];

    const spans: NerSpan[] = [];
    for (const [entityType, items] of Object.entries(data.entities)) {
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (!Array.isArray(item.span) || item.span.length !== 2) continue;
        const [start, end] = item.span;
        if (typeof start !== 'number' || typeof end !== 'number') continue;
        spans.push({
          start,
          end,
          entity: entityType,
          score: typeof item.confidence === 'number' ? item.confidence : 1,
        });
      }
    }
    return spans;
  }
}
