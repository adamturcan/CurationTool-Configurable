import { randomUUID } from 'node:crypto';
import type { SegmentAdapter, AdapterSchema } from '../NlpAdapter.js';
import type { Segment } from '../../types.js';

export class SduSegmentAdapter implements SegmentAdapter {
  readonly key = 'sdu-segment';
  readonly name = 'SDU Segmentation Service';
  readonly serviceType = 'segment' as const;
  readonly schema: AdapterSchema = {
    request: { text: "First sentence. Second sentence." },
    response: { results: [{ sentence_text: "First sentence.", label: 0, score: 0.009 }, { sentence_text: "Second sentence.", label: 0, score: 0.009 }] },
  };

  async call(request: { text: string }, endpointUrl: string): Promise<Segment[]> {
    if (!request.text || request.text.trim().length === 0) return [];

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: request.text }),
    });

    if (!response.ok) {
      throw new Error(`Segment API error: HTTP ${response.status}`);
    }

    const data = await response.json() as { results?: { sentence_text: string; label: number }[] };
    if (!data.results || data.results.length === 0) return [];

    const segments: Segment[] = [];
    let searchStart = 0;

    for (const item of data.results) {
      const segmentText = item.sentence_text;
      let segmentStart = request.text.indexOf(segmentText, searchStart);

      if (segmentStart === -1) {
        segmentStart = request.text.indexOf(segmentText);
        if (segmentStart === -1) continue;
      }

      const segmentEnd = segmentStart + segmentText.length;
      segments.push({
        id: randomUUID(),
        start: segmentStart,
        end: segmentEnd,
        order: item.label,
        text: segmentText,
      });

      searchStart = segmentEnd;
    }

    return segments;
  }
}
