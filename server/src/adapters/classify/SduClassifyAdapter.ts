import type { ClassifyAdapter, AdapterSchema } from '../NlpAdapter.js';
import type { ClassificationResult } from '../../types.js';

export class SduClassifyAdapter implements ClassifyAdapter {
  readonly key = 'sdu-classify';
  readonly name = 'SDU Classification Service';
  readonly serviceType = 'classify' as const;
  readonly schema: AdapterSchema = {
    request: { text: "The Holocaust memorial was visited by thousands." },
    response: { result: [{ label: 9373, score: 0.96, name: "memorials and museums" }, { label: 6093, score: 0.95, name: "post-conflict" }] },
  };

  async call(request: { text: string }, endpointUrl: string): Promise<ClassificationResult[]> {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: request.text }),
    });

    if (!response.ok) {
      throw new Error(`Classify API error: HTTP ${response.status}`);
    }

    const data = await response.json() as { result?: unknown; results?: unknown };

    return Array.isArray(data?.result)
      ? data.result
      : Array.isArray(data?.results) ? data.results : [];
  }
}
