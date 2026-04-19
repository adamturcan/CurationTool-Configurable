/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_NER_API_URL?: string;
  readonly VITE_SEGMENT_API_URL?: string;
  readonly VITE_CLASSIFY_API_URL?: string;
  readonly VITE_TRANSLATION_API_URL?: string;
  readonly VITE_TRANSLATION_LANGUAGES_URL?: string;
  readonly VITE_THESAURUS_URL?: string;
  readonly VITE_APP_TITLE?: string;
  readonly VITE_APP_LOGO?: string;
  readonly VITE_APP_LOGO_FULL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
