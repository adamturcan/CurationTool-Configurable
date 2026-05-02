import type { AuthService, AuthCredentials, RegisterCredentials, AuthResult } from '../../core/interfaces/AuthService';
import { User } from '../../core/entities/User';
import { requireNonEmptyString } from '../../core/usecases/validators';

const USER_KEY = 'memorise.user.v1';
const OPERATION = 'LocalAuthAdapter.login';

/**
 * Standalone auth adapter backed by localStorage.
 * Wraps the original username-only auth flow - no password, no tokens.
 * Uses the same localStorage key as the pre-PR-11 app for backward compatibility.
 *
 * @category Infrastructure
 */
export class LocalAuthAdapter implements AuthService {
  async login(credentials: AuthCredentials): Promise<AuthResult> {
    const username = requireNonEmptyString(credentials.username, {
      operation: OPERATION,
      field: 'username',
      code: 'USERNAME_REQUIRED',
    });

    localStorage.setItem(USER_KEY, username);
    const user = User.create({ id: username, username, role: 'admin' });
    return { user };
  }

  async register(credentials: RegisterCredentials): Promise<AuthResult> {
    // In standalone mode, register is the same as login
    return this.login({ username: credentials.username, password: '' });
  }

  async logout(): Promise<void> {
    localStorage.removeItem(USER_KEY);
  }

  async getCurrentUser(): Promise<User | null> {
    const username = localStorage.getItem(USER_KEY);
    if (!username) return null;
    return User.create({ id: username, username, role: 'admin' });
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(USER_KEY);
  }

  getToken(): string | null {
    return null;
  }
}
