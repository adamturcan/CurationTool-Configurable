import type { NerSpan, LanguageCode, TranslationRequest, TranslationResponse, Segment } from '../../types';
import type { ApiService } from '../../core/interfaces/ApiService';

/**
 * Thin proxy calling backend NLP routes instead of external APIs directly.
 * Used when VITE_BACKEND_URL is set. No format parsing — the backend handles
 * adapter selection and response normalization.
 *
 * @category Infrastructure
 */
export class BackendProxyApiService implements ApiService {
  private readonly backendUrl: string;
  private readonly getAuthToken: () => string | null;

  constructor(backendUrl: string, getAuthToken: () => string | null) {
    this.backendUrl = backendUrl.replace(/\/$/, '');
    this.getAuthToken = getAuthToken;
  }

  async classify(text: string): Promise<{ label?: number; name?: string }[]> {
    return this.post('/api/classify', { text });
  }

  async ner(text: string): Promise<NerSpan[]> {
    return this.post('/api/ner', { text });
  }

  async segmentText(text: string): Promise<Segment[]> {
    if (!text || text.trim().length === 0) return [];
    return this.post('/api/segment', { text });
  }

  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    return this.post('/api/translate', request);
  }

  async getSupportedLanguages(): Promise<LanguageCode[]> {
    return this.get('/api/translate/languages');
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${this.backendUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const msg = await response.text().catch(() => '');
      throw new Error(`API error (HTTP ${response.status})${msg ? `: ${msg}` : ''}`);
    }

    return response.json() as Promise<T>;
  }

  private async get<T>(path: string): Promise<T> {
    const headers: Record<string, string> = {};
    const token = this.getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${this.backendUrl}${path}`, { headers });

    if (!response.ok) {
      throw new Error(`API error (HTTP ${response.status})`);
    }

    return response.json() as Promise<T>;
  }
}
