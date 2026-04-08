/**
 * Singleton provider for AuthService.
 * Picks LocalAuthAdapter (standalone) or RemoteAuthAdapter (server)
 * based on VITE_BACKEND_URL. Supports DI overrides for testing.
 *
 * @category Infrastructure
 */
import { LocalAuthAdapter } from '../adapters/LocalAuthAdapter';
import { RemoteAuthAdapter } from '../adapters/RemoteAuthAdapter';
import type { AuthService } from '../../core/interfaces/AuthService';

export interface AuthProviderOverrides {
  authService?: AuthService;
}

let authServiceSingleton: AuthService | null = null;
let overrides: AuthProviderOverrides | null = null;

export function setAuthProviderOverrides(next: AuthProviderOverrides): void {
  overrides = next;
  if (next.authService) {
    authServiceSingleton = null;
  }
}

export function resetAuthProvider(): void {
  overrides = null;
  authServiceSingleton = null;
}

function createDefaultAuthService(): AuthService {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  return backendUrl
    ? new RemoteAuthAdapter(backendUrl)
    : new LocalAuthAdapter();
}

export function getAuthService(): AuthService {
  if (overrides?.authService) {
    return overrides.authService;
  }

  if (!authServiceSingleton) {
    authServiceSingleton = createDefaultAuthService();
  }

  return authServiceSingleton;
}
