/**
 * Singleton provider for AuthService — picks LocalAuthAdapter (standalone, localStorage-backed) or RemoteAuthAdapter (server, JWT-backed) based on `VITE_BACKEND_URL`.
 * Production code calls `getAuthService()`; tests can substitute an implementation via `setAuthProviderOverrides` and reset via `resetAuthProvider`.
 * Other providers (apiProvider, workspaceProvider, configProvider) read tokens from this provider, so overriding here is enough to feed credentials into all of them at once.
 * The non-obvious detail is that token reads happen lazily through closures (`() => getAuthService().getToken()`) — so the provider override must be installed *before* a request fires, not just before the consuming service is constructed.
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
