import type { ClassifyAdapter, AdapterSchema } from '../NlpAdapter.js';
import type { ClassificationResult } from '../../types.js';

interface MedicalSubcategory {
  code: string;
  name: string;
  score?: number;
}

interface MedicalCategory {
  icd10_chapter?: string;
  name: string;
  code_range?: string;
  score?: number;
  subcategories?: MedicalSubcategory[];
}

interface MedicalCategoriseResponse {
  metadata?: unknown;
  categories: MedicalCategory[];
}

export class MockMedicalClassifyAdapter implements ClassifyAdapter {
  readonly key = 'mock-medical';
  readonly name = 'Mock Medical (ICD-10 Classifier)';
  readonly serviceType = 'classify' as const;
  readonly schema: AdapterSchema = {
    request: { text: 'Patient has type 2 diabetes mellitus.' },
    response: {
      metadata: { model: 'mock-icd-v1' },
      categories: [
        {
          icd10_chapter: 'IV',
          name: 'Endocrine, nutritional and metabolic diseases',
          code_range: 'E00-E89',
          score: 0.91,
          subcategories: [{ code: 'E11', name: 'Type 2 diabetes mellitus', score: 0.88 }],
        },
      ],
    },
  };

  async call(request: { text: string }, endpointUrl: string): Promise<ClassificationResult[]> {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: request.text }),
    });

    if (!response.ok) {
      throw new Error(`Medical Categorise API error: HTTP ${response.status}`);
    }

    const data = await response.json() as MedicalCategoriseResponse;
    if (!Array.isArray(data?.categories)) return [];

    const results: ClassificationResult[] = [];
    let label = 0;
    for (const category of data.categories) {
      if (!category || typeof category.name !== 'string') continue;
      results.push({ label: label++, name: category.name });
      if (Array.isArray(category.subcategories)) {
        for (const sub of category.subcategories) {
          if (!sub || typeof sub.name !== 'string') continue;
          results.push({ label: label++, name: sub.name });
        }
      }
    }
    return results;
  }
}
