import { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, AuthContextValue } from '@/app/providers/AuthProvider';
import { AuthUser, Role } from '@/types';

export const makeUser = (role: Role): AuthUser => ({
  id: `id-${role}`, name: `Test ${role} User With Long Name`, email: `${role.toLowerCase()}@test.dev`, address: '1 Road', role, createdAt: new Date().toISOString(),
});

export function renderApp(ui: ReactElement, opts: { user?: AuthUser | null; route?: string; auth?: Partial<AuthContextValue> } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const auth: AuthContextValue = {
    user: opts.user ?? null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    ...opts.auth,
  };
  return {
    client,
    auth,
    ...render(
      <QueryClientProvider client={client}>
        <AuthContext.Provider value={auth}>
          <MemoryRouter initialEntries={[opts.route ?? '/']}>{ui}</MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>,
    ),
  };
}
