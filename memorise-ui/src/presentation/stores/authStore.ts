/**
 * Zustand store for authentication state.
 * Replaces the scattered useState(username) in App.tsx.
 * Components read user/isLoading/isServerMode from here.
 *
 * @category Stores
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { User } from '../../core/entities/User';

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isServerMode: boolean;

  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set) => ({
      user: null,
      isLoading: true,
      error: null,
      isServerMode: !!import.meta.env.VITE_BACKEND_URL,

      setUser: (user) => set({ user, error: null }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),
      clearAuth: () => set({ user: null, error: null, isLoading: false }),
    }),
    { name: 'auth-store' }
  )
);
