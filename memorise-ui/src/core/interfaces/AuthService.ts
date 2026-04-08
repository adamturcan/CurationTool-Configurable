import type { User } from '../entities/User';

/**
 * Credentials for login.
 * In standalone mode, password is ignored.
 */
export interface AuthCredentials {
  username: string;
  password: string;
}

/** Credentials for new user registration (server mode only). */
export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

/** Result of a successful login or registration. */
export interface AuthResult {
  user: User;
  token?: string;
}

/**
 * Contract for authentication operations.
 * Implemented by LocalAuthAdapter (standalone) and RemoteAuthAdapter (server).
 *
 * @category Interfaces
 */
export interface AuthService {
  login(credentials: AuthCredentials): Promise<AuthResult>;
  register(credentials: RegisterCredentials): Promise<AuthResult>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  isAuthenticated(): boolean;
  getToken(): string | null;
}
