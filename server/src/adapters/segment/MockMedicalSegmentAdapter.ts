import { randomUUID } from 'node:crypto';
import type { SegmentAdapter, AdapterSchema } from '../NlpAdapter.js';
import type { Segment } from '../../types.js';

interface MedicalSection {
  name: string;
  char_range: { from: number; to: number };
  text: string;
  subsections?: unknown[];
}

interface MedicalSectionizeResponse {
  metadata?: unknown;
  sections: MedicalSection[];
}

export class MockMedicalSegmentAdapter implements SegmentAdapter {
  readonly key = 'mock-medical';
  readonly name = 'Mock Medical (SOAP Sectionizer)';
  readonly serviceType = 'segment' as const;
  readonly schema: AdapterSchema = {
    request: { text: 'Patient is well. Plan: continue meds.' },
    response: {
      metadata: { model: 'mock-section-v1' },
      sections: [
        { name: 'subjective', char_range: { from: 0, to: 16 }, text: 'Patient is well.', subsections: [] },
        { name: 'plan', char_range: { from: 17, to: 37 }, text: 'Plan: continue meds.', subsections: [] },
      ],
    },
  };

  async call(request: { text: string }, endpointUrl: string): Promise<Segment[]> {
    if (!request.text || request.text.trim().length === 0) return [];

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: request.text }),
    });

    if (!response.ok) {
      throw new Error(`Medical Sectionize API error: HTTP ${response.status}`);
    }

    const data = await response.json() as MedicalSectionizeResponse;
    if (!Array.isArray(data?.sections)) return [];

    const segments: Segment[] = [];
    let order = 0;
    for (const section of data.sections) {
      if (!section || !section.char_range) continue;
      const { from, to } = section.char_range;
      if (typeof from !== 'number' || typeof to !== 'number') continue;
      segments.push({
        id: randomUUID(),
        start: from,
        end: to,
        text: typeof section.text === 'string' ? section.text : request.text.substring(from, to),
        order: order++,
      });
    }
    return segments;
  }
}
