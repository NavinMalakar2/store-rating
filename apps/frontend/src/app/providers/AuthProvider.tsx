import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, setUnauthorizedHandler } from '@/lib/api';
import { authService } from '@/services/auth.service';
import { AuthUser } from '@/types';

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
export const ME_KEY = ['me'] as const;

/** The role always comes from the server (GET /auth/me) — nothing is persisted in browser storage. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try { return await authService.me(); } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    // Any 401 from a protected call means the session expired: drop cached data and show login.
    setUnauthorizedHandler(() => { qc.setQueryData(ME_KEY, null); qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' }); });
    return () => setUnauthorizedHandler(null);
  }, [qc]);

  const login = useCallback(async (email: string, password: string) => {
    const user = await authService.login({ email, password });
    qc.clear();
    qc.setQueryData(ME_KEY, user);
    return user;
  }, [qc]);

  const logout = useCallback(async () => {
    try { await authService.logout(); } finally { qc.clear(); qc.setQueryData(ME_KEY, null); }
  }, [qc]);

  const value = useMemo(() => ({ user: data ?? null, isLoading, login, logout }), [data, isLoading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
