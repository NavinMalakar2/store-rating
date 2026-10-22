import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { AppRoutes } from '@/app/router';
import { ApiError } from '@/lib/api';
import { authService } from '@/services/auth.service';
import { AuthUser } from '@/types';

vi.mock('@/services/auth.service', () => ({
  authService: {
    me: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    changePassword: vi.fn(),
  },
}));

vi.mock('@/services/store.service', () => ({
  storeService: {
    list: vi.fn().mockResolvedValue({
      items: [],
      meta: { totalRecords: 0, currentPage: 1, pageSize: 9, totalPages: 1 },
    }),
  },
  ownerService: { dashboard: vi.fn() },
}));

const user: AuthUser = {
  id: 'user-1',
  name: 'Test User Account',
  email: 'user@test.dev',
  address: '1 Test Road',
  role: 'USER',
  createdAt: new Date().toISOString(),
};

function renderRoutes(route: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('authentication transitions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('navigates to the role dashboard immediately after login', async () => {
    vi.mocked(authService.me).mockRejectedValue(new ApiError(401, 'Not signed in'));
    vi.mocked(authService.login).mockResolvedValue(user);
    renderRoutes('/login');

    await screen.findByRole('heading', { name: 'Welcome back' });
    await userEvent.type(screen.getByLabelText('Email'), user.email);
    await userEvent.type(screen.getByLabelText('Password'), 'Valid@123');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    expect(authService.login).toHaveBeenCalledWith({ email: user.email, password: 'Valid@123' });
    expect(await screen.findByRole('heading', { name: 'Stores' })).toBeInTheDocument();
  });

  it('hides protected content and redirects immediately while logout is pending', async () => {
    vi.mocked(authService.me).mockResolvedValue(user);
    let finishLogout!: (value: null) => void;
    vi.mocked(authService.logout).mockReturnValue(
      new Promise((resolve) => {
        finishLogout = resolve;
      }),
    );
    renderRoutes('/stores');

    await screen.findByRole('heading', { name: 'Stores' });
    await userEvent.click(screen.getByRole('button', { name: /log out/i }));

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    finishLogout(null);
  });
});
