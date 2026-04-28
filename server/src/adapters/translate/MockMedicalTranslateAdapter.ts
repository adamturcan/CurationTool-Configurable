import type { TranslateAdapter, AdapterSchema } from '../NlpAdapter.js';
import type { TranslationRequest, TranslationResponse, LanguageCode } from '../../types.js';

interface MedicalTranslateOutput {
  expanded_text: string;
  language: string;
  expansions?: { abbreviation: string; expansion: string; position: number }[];
}

interface MedicalTranslateResponse {
  metadata?: unknown;
  output: MedicalTranslateOutput;
}

interface MedicalLanguagesResponse {
  metadata?: unknown;
  supported: { code: string; name: string }[];
}

export class MockMedicalTranslateAdapter implements TranslateAdapter {
  readonly key = 'mock-medical';
  readonly name = 'Mock Medical (Abbreviation Expander)';
  readonly serviceType = 'translate' as const;
  readonly schema: AdapterSchema = {
    request: { tgt_lang: 'en', text: 'Patient has T2DM.' },
    response: {
      metadata: { model: 'mock-medex-v1' },
      output: {
        expanded_text: 'Patient has Type 2 Diabetes Mellitus.',
        language: 'en',
        expansions: [{ abbreviation: 'T2DM', expansion: 'Type 2 Diabetes Mellitus', position: 12 }],
      },
    },
  };

  private cachedLanguages: LanguageCode[] | null = null;

  async call(request: TranslationRequest, endpointUrl: string): Promise<TranslationResponse> {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: request.text, expand_abbreviations: true }),
    });

    if (!response.ok) {
      throw new Error(`Medical Translate API error: HTTP ${response.status}`);
    }

    const data = await response.json() as MedicalTranslateResponse;
    if (!data?.output || typeof data.output.expanded_text !== 'string') {
      throw new Error('Medical translate API returned invalid response');
    }

    return {
      translatedText: data.output.expanded_text,
      targetLang: (data.output.language ?? 'en') as LanguageCode,
      sourceLang: request.sourceLang,
    };
  }

  async getSupportedLanguages(endpointUrl: string): Promise<LanguageCode[]> {
    if (this.cachedLanguages) return this.cachedLanguages;

    try {
      const response = await fetch(endpointUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json() as MedicalLanguagesResponse;
      if (Array.isArray(data?.supported)) {
        const languages = data.supported
          .map(l => l?.code)
          .filter((c): c is string => typeof c === 'string');
        if (languages.length > 0) {
          this.cachedLanguages = languages;
          return languages;
        }
      }
    } catch {
      // fall through to single-language fallback
    }

    this.cachedLanguages = ['en'];
    return this.cachedLanguages;
  }
}
