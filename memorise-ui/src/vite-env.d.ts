/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_NER_API_URL?: string;
  readonly VITE_SEGMENT_API_URL?: string;
  readonly VITE_CLASSIFY_API_URL?: string;
  readonly VITE_TRANSLATION_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
