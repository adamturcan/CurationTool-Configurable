/** ISO 639-1 language code (e.g. "en", "de", "cs") */
export type LanguageCode = string;

/** Payload sent to the translation API endpoint */
export interface TranslationRequest {
  text: string;
  targetLang: LanguageCode;
  sourceLang?: LanguageCode;
}

/** Response returned by the translation API endpoint */
export interface TranslationResponse {
  translatedText: string;
  targetLang: LanguageCode;
  sourceLang?: LanguageCode;
}
