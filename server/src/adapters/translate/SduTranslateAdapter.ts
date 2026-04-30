import type { TranslateAdapter, AdapterSchema } from '../NlpAdapter.js';
import type { TranslationRequest, TranslationResponse, SupportedLanguage } from '../../types.js';

const LANGUAGE_CODE_MAP: Record<string, string> = {
  eng: 'en', ces: 'cs', dan: 'da', nld: 'nl',
};

function parseLanguagesPayload(raw: unknown): SupportedLanguage[] | null {
  if (!Array.isArray(raw)) return null;
  const parsed: SupportedLanguage[] = [];
  for (const entry of raw) {
    if (typeof entry === 'string') {
      parsed.push({ code: entry, name: entry });
    } else if (entry && typeof entry === 'object') {
      const code = (entry as { code?: unknown }).code;
      const name = (entry as { name?: unknown }).name;
      if (typeof code === 'string') {
        parsed.push({ code, name: typeof name === 'string' && name.length > 0 ? name : code });
      }
    }
  }
  return parsed.length > 0 ? parsed : null;
}

export class SduTranslateAdapter implements TranslateAdapter {
  readonly key = 'sdu-translate';
  readonly name = 'SDU Translation Service';
  readonly serviceType = 'translate' as const;
  readonly schema: AdapterSchema = {
    request: { tgt_lang: "en", text: "Hallo Welt" },
    response: { text: "Hello World" },
  };

  private cachedLanguages: SupportedLanguage[] | null = null;

  async call(request: TranslationRequest, endpointUrl: string): Promise<TranslationResponse> {
    let targetLang = request.targetLang;
    let sourceLang = request.sourceLang;

    if (LANGUAGE_CODE_MAP[targetLang]) targetLang = LANGUAGE_CODE_MAP[targetLang];
    if (sourceLang && LANGUAGE_CODE_MAP[sourceLang]) sourceLang = LANGUAGE_CODE_MAP[sourceLang];

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tgt_lang: targetLang, text: request.text }),
    });

    if (!response.ok) {
      throw new Error(`Translate API error: HTTP ${response.status}`);
    }

    const data = await response.json() as { text?: string };
    if (!data || typeof data.text !== 'string') {
      throw new Error('Translation API returned invalid response');
    }

    return {
      translatedText: data.text,
      targetLang,
      sourceLang,
    };
  }

  async getSupportedLanguages(endpointUrl: string): Promise<SupportedLanguage[]> {
    if (this.cachedLanguages) return this.cachedLanguages;

    const response = await fetch(endpointUrl);
    if (!response.ok) throw new Error(`Supported languages API error: HTTP ${response.status}`);

    const data = await response.json() as { languages?: unknown };
    const parsed = parseLanguagesPayload(data.languages);
    if (!parsed) throw new Error('Supported languages API returned invalid response');

    this.cachedLanguages = parsed;
    return parsed;
  }
}
