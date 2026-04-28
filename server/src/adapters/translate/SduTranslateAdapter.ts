import type { TranslateAdapter, AdapterSchema } from '../NlpAdapter.js';
import type { TranslationRequest, TranslationResponse, LanguageCode } from '../../types.js';

const LANGUAGE_CODE_MAP: Record<string, string> = {
  eng: 'en', ces: 'cs', dan: 'da', nld: 'nl',
};

const FALLBACK_LANGUAGES: LanguageCode[] = [
  'ar', 'be', 'bg', 'bs', 'cs', 'da', 'de', 'el', 'en', 'es', 'et', 'fa', 'fi', 'fr', 'ga',
  'he', 'hi', 'hr', 'hu', 'hy', 'it', 'jp', 'ko', 'ku', 'lt', 'lv', 'mk', 'mt', 'nl', 'no',
  'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sr', 'sv', 'tr', 'uk', 'vi', 'yi', 'zh',
];

export class SduTranslateAdapter implements TranslateAdapter {
  readonly key = 'sdu-translate';
  readonly name = 'SDU Translation Service';
  readonly serviceType = 'translate' as const;
  readonly schema: AdapterSchema = {
    request: { tgt_lang: "en", text: "Hallo Welt" },
    response: { text: "Hello World" },
  };

  private cachedLanguages: LanguageCode[] | null = null;

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
      sourceLang: sourceLang as LanguageCode | undefined,
    };
  }

  async getSupportedLanguages(endpointUrl: string): Promise<LanguageCode[]> {
    if (this.cachedLanguages) return this.cachedLanguages;

    try {
      const response = await fetch(endpointUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json() as { languages?: unknown };
      const languages = Array.isArray(data.languages)
        ? data.languages.filter((l): l is string => typeof l === 'string')
        : null;

      if (languages && languages.length > 0) {
        this.cachedLanguages = languages;
        return languages;
      }
    } catch {
      // fall through to fallback
    }

    this.cachedLanguages = [...FALLBACK_LANGUAGES];
    return this.cachedLanguages;
  }
}
