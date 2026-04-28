export type LanguageCode = string;

export interface NerSpan {
  id?: string;
  origin?: 'api' | 'user';
  start: number;
  end: number;
  entity: string;
  score?: number;
}

export interface Segment {
  id: string;
  start: number;
  end: number;
  text: string;
  order: number;
  isEdited?: boolean;
}

export interface TranslationRequest {
  text: string;
  targetLang: LanguageCode;
  sourceLang?: LanguageCode;
}

export interface TranslationResponse {
  translatedText: string;
  targetLang: LanguageCode;
  sourceLang?: LanguageCode;
}

export type TagSource = 'api' | 'user';

export interface TagItem {
  name: string;
  source: TagSource;
  label?: number;
  parentId?: number;
  segmentId?: string;
}

export interface TranslationDTO {
  language: string;
  sourceLang: string;
  createdAt: number;
  updatedAt: number;
  text: string;
  userSpans?: NerSpan[];
  apiSpans?: NerSpan[];
  deletedApiKeys?: string[];
  segmentTranslations?: Record<string, string>;
  editedSegmentTranslations?: Record<string, boolean>;
}

export interface WorkspaceDTO {
  id: string;
  name: string;
  owner?: string;
  isTemporary?: boolean;
  updatedAt?: number;
  text?: string;
  userSpans?: NerSpan[];
  apiSpans?: NerSpan[];
  deletedApiKeys?: string[];
  tags?: TagItem[];
  segments?: Segment[];
  translations?: TranslationDTO[];
}

export interface ApiEndpointConfig {
  name: string;
  key: string;
  url: string;
  adapter?: string;
}

export interface AppConfig {
  endpoints: ApiEndpointConfig[];
}

export interface User {
  id: string;
  username: string;
  email?: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: number;
  updatedAt: number;
}

export interface CreateUserInput {
  username: string;
  email?: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface ClassificationResult {
  label?: number;
  name?: string;
}
