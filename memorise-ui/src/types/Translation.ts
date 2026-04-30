/** Payload sent to the translation API endpoint */
export interface TranslationRequest {
  text: string;
  targetLang: string;
  sourceLang?: string;
}

/** Response returned by the translation API endpoint */
export interface TranslationResponse {
  translatedText: string;
  targetLang: string;
  sourceLang?: string;
}

/** Entry returned by the supported-languages endpoint: ISO code plus human-readable name. */
export interface SupportedLanguage {
  code: string;
  name: string;
}
