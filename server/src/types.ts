/**
 * Shared domain types used across the server. 
 */

/**
 * A named-entity span over the workspace text.
 * `start` and `end` are absolute character offsets
 * `origin` distinguishes adapter-produced spans from user-edited ones.
 */
export interface NerSpan {
  id?: string;
  origin?: 'api' | 'user';
  start: number;
  end: number;
  entity: string;
  score?: number;
}

/** A contiguous range of the source text produced by segmentation.
 * `isEdited` marks segments whose boundaries the user has changed. */
export interface Segment {
  id: string;
  start: number;
  end: number;
  text: string;
  order: number;
  isEdited?: boolean;
}

/** Payload sent to a translate adapter. */
export interface TranslationRequest {
  text: string;
  targetLang: string;
  sourceLang?: string;
}

/** Response returned by a translate adapter. */
export interface TranslationResponse {
  translatedText: string;
  targetLang: string;
  sourceLang?: string;
}

/** Language code + display name advertised by a translate adapter. */
export interface SupportedLanguage {
  code: string;
  name: string;
}

/** origin of a tag from the classify adapter or added by the user. */
export type TagSource = 'api' | 'user';

/** A classification tag attached to a workspace or a specific segment. */
export interface TagItem {
  name: string;
  source: TagSource;
  label?: number;
  parentId?: number;
  segmentId?: string;
}

/** A translation of the workspace text into a target language, with its own spans and per-segment overrides. */
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

/** Persisted form of a workspace - what the database stores and what the frontend hydrates from. */
export interface WorkspaceDTO {
  id: string;
  name: string;
  owner?: string;
  isTemporary?: boolean;
  createdAt?: number;
  updatedAt?: number;
  text?: string;
  userSpans?: NerSpan[];
  apiSpans?: NerSpan[];
  deletedApiKeys?: string[];
  tags?: TagItem[];
  segments?: Segment[];
  translations?: TranslationDTO[];
  /** Frontend-managed UI action counters. The server stores them as an opaque blob. */
  counters?: unknown;
}

/** One configured NLP endpoint.
* `key` identifies the service
* `adapter` names the implementation in the registry. */
export interface ApiEndpointConfig {
  name: string;
  key: string;
  url: string;
  adapter?: string;
}

/** A registered user.
* `passwordHash` is a bcrypt hash. */
export interface User {
  id: string;
  username: string;
  email?: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: number;
  updatedAt: number;
}

/** Input for registration.
* The password is hashed before persisting. */
export interface CreateUserInput {
  username: string;
  email?: string;
  password: string;
  role?: 'admin' | 'user';
}

/** Result of a classify call.
 * Adapters may return a numeric label, a name, or both. */
export interface ClassificationResult {
  label?: number;
  name?: string;
}
