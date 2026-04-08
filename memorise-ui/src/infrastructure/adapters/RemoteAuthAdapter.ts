import type { AuthService, AuthCredentials, RegisterCredentials, AuthResult } from '../../core/interfaces/AuthService';
import { User } from '../../core/entities/User';
import type { UserProps } from '../../core/entities/User';

const ACCESS_KEY = 'memorise.auth.access';
const REFRESH_KEY = 'memorise.auth.refresh';
const USER_CACHE_KEY = 'memorise.auth.user';

/**
 * JWT-based auth adapter against a backend API.
 * Stores access/refresh tokens and cached user data in localStorage.
 *
 * Expected backend endpoints:
 * - POST /auth/login    → { user, accessToken, refreshToken }
 * - POST /auth/register → { user, accessToken, refreshToken }
 * - POST /auth/refresh  → { accessToken, refreshToken }
 * - POST /auth/logout   → 204
 *
 * @category Infrastructure
 */
export class RemoteAuthAdapter implements AuthService {
  private readonly backendUrl: string;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(backendUrl: string) {
    this.backendUrl = backendUrl.replace(/\/$/, '');
  }

  async login(credentials: AuthCredentials): Promise<AuthResult> {
    const response = await fetch(`${this.backendUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
      }),
    });

    if (!response.ok) {
      const msg = await this.extractErrorMessage(response, 'Login failed');
      throw new Error(msg);
    }

    return this.handleAuthResponse(response);
  }

  async register(credentials: RegisterCredentials): Promise<AuthResult> {
    const response = await fetch(`${this.backendUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: credentials.username,
        email: credentials.email,
        password: credentials.password,
      }),
    });

    if (!response.ok) {
      const msg = await this.extractErrorMessage(response, 'Registration failed');
      throw new Error(msg);
    }

    return this.handleAuthResponse(response);
  }

  async logout(): Promise<void> {
    const token = localStorage.getItem(ACCESS_KEY);
    // Fire-and-forget server logout
    if (token) {
      void fetch(`${this.backendUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => { /* ignore */ });
    }
    this.clearStoredAuth();
  }

  async getCurrentUser(): Promise<User | null> {
    const cached = localStorage.getItem(USER_CACHE_KEY);
    const token = localStorage.getItem(ACCESS_KEY);

    if (!cached || !token) return null;

    // Check if token is expired
    if (this.isTokenExpired(token)) {
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        this.clearStoredAuth();
        return null;
      }
    }

    try {
      const props = JSON.parse(cached) as UserProps;
      return User.create(props);
    } catch {
      this.clearStoredAuth();
      return null;
    }
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem(ACCESS_KEY);
    return !!token && !this.isTokenExpired(token);
  }

  getToken(): string | null {
    const token = localStorage.getItem(ACCESS_KEY);
    if (!token || this.isTokenExpired(token)) return null;
    return token;
  }

  private async refreshToken(): Promise<string | null> {
    // Dedup concurrent refresh requests
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (!refreshToken) return null;

      try {
        const response = await fetch(`${this.backendUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) return null;

        const data = await response.json() as { accessToken?: string; refreshToken?: string };
        if (data.accessToken) {
          localStorage.setItem(ACCESS_KEY, data.accessToken);
          if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
          return data.accessToken;
        }
        return null;
      } catch {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async handleAuthResponse(response: Response): Promise<AuthResult> {
    const data = await response.json() as {
      user?: { id?: string; username?: string; email?: string };
      accessToken?: string;
      refreshToken?: string;
    };

    if (!data.user?.id || !data.user?.username) {
      throw new Error('Invalid auth response: missing user data');
    }

    const user = User.create({
      id: data.user.id,
      username: data.user.username,
      email: data.user.email,
    });

    if (data.accessToken) localStorage.setItem(ACCESS_KEY, data.accessToken);
    if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ id: user.id, username: user.username, email: user.email }));

    return { user, token: data.accessToken };
  }

  private clearStoredAuth(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_CACHE_KEY);
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
      if (!payload.exp) return false;
      // 30 second buffer before actual expiry
      return Date.now() >= (payload.exp * 1000) - 30000;
    } catch {
      return true;
    }
  }

  private async extractErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
      const data = await response.json() as { message?: string; error?: string };
      return data.message ?? data.error ?? `${fallback} (HTTP ${response.status})`;
    } catch {
      return `${fallback} (HTTP ${response.status})`;
    }
  }
}
