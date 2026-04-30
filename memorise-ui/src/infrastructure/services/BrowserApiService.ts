import type { NerSpan, TranslationRequest, TranslationResponse, Segment, SupportedLanguage } from '../../types';
import type {
  ApiService as ApiServiceContract,
} from '../../core/interfaces/ApiService';
import { getConfigService } from '../providers/configProvider';
import { toAppError, toValidationError } from '../../shared/errors';


function parseLanguagesPayload(raw: unknown): SupportedLanguage[] | null {
  if (!Array.isArray(raw)) return null;
  const parsed: SupportedLanguage[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      parsed.push({ code: entry, name: entry });
    } else if (entry && typeof entry === "object") {
      const code = (entry as { code?: unknown }).code;
      const name = (entry as { name?: unknown }).name;
      if (typeof code === "string") {
        parsed.push({ code, name: typeof name === "string" && name.length > 0 ? name : code });
      }
    }
  }
  return parsed.length > 0 ? parsed : null;
}


const LANGUAGE_CODE_MAP: Record<string, string> = {
  eng: "en",
  ces: "cs",
  dan: "da",
  nld: "nl",
};


/**
 * Implements ApiService contract with HTTP calls to external NLP APIs.
 * Accessed via getApiService() provider — never instantiated directly.
 *
 * Endpoints are resolved via ConfigService (env vars or server config) with SDU defaults as fallback.
 * Language list is cached after a successful fetch; failures propagate to the caller.
 *
 * @category Infrastructure
 */
export class BrowserApiService implements ApiServiceContract {

  private supportedLanguagesCache: SupportedLanguage[] | null = null;
  private supportedLanguagesSetCache: Set<string> | null = null;
  private supportedLanguagesPromise: Promise<SupportedLanguage[]> | null = null;

  private static readonly FALLBACK_URLS: Record<string, string> = {
    ner: "https://ner-api.dev.memorise.sdu.dk/recognize",
    segment: "https://textseg-api.dev.memorise.sdu.dk/segment",
    classify: "https://semtag-api.dev.memorise.sdu.dk/classify",
    translate: "https://mt-api.dev.memorise.sdu.dk/translate",
    "translate-languages": "https://mt-api.dev.memorise.sdu.dk/supported_languages",
  };

  private getEndpointUrl(key: string): string {
    return getConfigService().getEndpoint(key)?.url
      ?? BrowserApiService.FALLBACK_URLS[key]
      ?? '';
  }

  // Classify 

  async classify(text: string): Promise<{ label?: number; name?: string }[]> {
    const context = { operation: "classify text", payloadLength: text.length };

    try {
      const response = await fetch(this.getEndpointUrl('classify'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw toAppError(response, context);
      }

      const data = await response.json();

      return Array.isArray(data?.result)
        ? data.result
        : Array.isArray(data?.results) ? data.results : [];

    } catch (error) {
      throw toAppError(error, context);
    }
  }

  // NER

  async ner(text: string): Promise<NerSpan[]> {
    const context = { operation: "run NER", payloadLength: text.length };

    try {
      const response = await fetch(this.getEndpointUrl('ner'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw toAppError(response, context);
      }

      const result = await response.json();
      const rawSpans = Array.isArray(result?.result) ? result.result : [];

      return rawSpans.map((span: { start: number; end: number; type: string; score?: number }) => ({
        start: span.start,
        end: span.end,
        entity: span.type,
        score: typeof span.score === "number" ? span.score : 1,
      }));

    } catch (error) {
      throw toAppError(error, context);
    }
  }

  // Segmentation 

  async segmentText(text: string): Promise<Segment[]> {
    if (!text || text.trim().length === 0) return [];

    const context = { operation: "segment text", payloadLength: text.length };

    try {
      const response = await fetch(this.getEndpointUrl('segment'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw toAppError(response, context);
      }

      const data = await response.json();
      if (!data.results || data.results.length === 0) return [];

      const segments: Segment[] = [];
      let searchStart = 0;

      for (let i = 0; i < data.results.length; i++) {
        const segmentText = data.results[i].sentence_text;
        let segmentStart = text.indexOf(segmentText, searchStart);

        if (segmentStart === -1) {
          segmentStart = text.indexOf(segmentText);
          if (segmentStart === -1) continue;
        }

        const segmentEnd = segmentStart + segmentText.length;
        segments.push({
          id: crypto.randomUUID(),
          start: segmentStart,
          end: segmentEnd,
          order: data.results[i].label,
          text: segmentText
        });

        searchStart = segmentEnd;
      }

      return segments;
    } catch (error) {
      throw toAppError(error, context);
    }
  }

  // Translation 

  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    if (!request.text || !request.text.trim()) {
      throw toValidationError(
        "Translation text cannot be empty",
        { operation: "validate translation request", field: "text" }
      );
    }

    if (request.text.length > 50000) {
      throw toValidationError(
        "Translation text too long (max 50,000 characters)",
        { operation: "validate translation request", field: "text", length: request.text.length }
      );
    }

    let targetLang = request.targetLang;
    let sourceLang = request.sourceLang;

    if (LANGUAGE_CODE_MAP[targetLang]) targetLang = LANGUAGE_CODE_MAP[targetLang];
    if (sourceLang && LANGUAGE_CODE_MAP[sourceLang]) sourceLang = LANGUAGE_CODE_MAP[sourceLang];

    const supportedSet = await this.memoizedSupportedLanguagesSet();

    if (!supportedSet.has(targetLang)) {
      throw toValidationError(
        `Unsupported target language: ${targetLang}`,
        { operation: "validate translation request", field: "targetLang", value: targetLang }
      );
    }

    if (sourceLang && !supportedSet.has(sourceLang)) {
      throw toValidationError(
        `Unsupported source language: ${sourceLang}`,
        { operation: "validate translation request", field: "sourceLang", value: sourceLang }
      );
    }

    const endpoint = this.getEndpointUrl('translate');
    const context = { operation: "translate text", endpoint, targetLang, payloadLength: request.text.length };

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tgt_lang: targetLang, text: request.text }),
      });
    } catch (error) {
      throw toAppError(error, context);
    }

    if (!response.ok) {
      throw toAppError(response, context);
    }

    let data: { text?: string };
    try {
      data = (await response.json()) as { text?: string };
    } catch (error) {
      throw toAppError(error, { ...context, operation: "parse translation response" });
    }

    if (!data || typeof data.text !== "string") {
      throw toValidationError(
        "Translation API returned an invalid response",
        { ...context, responseSnapshot: data }
      );
    }

    return {
      translatedText: data.text,
      targetLang,
      sourceLang: sourceLang as string | undefined,
    };
  }

  async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    if (this.supportedLanguagesCache) {
      return this.supportedLanguagesCache;
    }

    if (!this.supportedLanguagesPromise) {
      this.supportedLanguagesPromise = (async () => {
        const endpoint = this.getEndpointUrl('translate-languages');
        const context = { operation: "fetch supported languages", endpoint };

        try {
          const response = await fetch(endpoint);
          if (!response.ok) throw toAppError(response, context);

          const data = (await response.json()) as { languages?: unknown };
          const languages = parseLanguagesPayload(data.languages);
          if (!languages) {
            throw toValidationError(
              "Supported languages response malformed",
              { ...context, receivedType: typeof data.languages }
            );
          }

          this.supportedLanguagesCache = languages;
          this.supportedLanguagesSetCache = new Set(languages.map((l) => l.code));
          return languages;
        } finally {
          this.supportedLanguagesPromise = null;
        }
      })();
    }

    return this.supportedLanguagesPromise;
  }

  private async memoizedSupportedLanguagesSet(): Promise<Set<string>> {
    if (this.supportedLanguagesSetCache) return this.supportedLanguagesSetCache;
    const languages = await this.getSupportedLanguages();
    this.supportedLanguagesSetCache = new Set(languages.map((l) => l.code));
    return this.supportedLanguagesSetCache;
  }
}
