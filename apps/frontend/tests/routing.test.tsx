import { screen } from '@testing-library/react';
import { AppRoutes } from '@/app/router';
import { makeUser, renderApp } from './utils';

vi.mock('@/services/admin.service', () => ({
  adminService: {
    dashboard: vi.fn().mockResolvedValue({ totalUsers: 7, totalStores: 3, totalRatings: 9, averageRating: 4, ratingDistribution: [1, 2, 3, 4, 5].map((rating) => ({ rating, count: 0 })), usersByRole: [] }),
    users: vi.fn().mockResolvedValue({ items: [], meta: { totalRecords: 0, currentPage: 1, pageSize: 10, totalPages: 1 } }),
    stores: vi.fn().mockResolvedValue({ items: [], meta: { totalRecords: 0, currentPage: 1, pageSize: 10, totalPages: 1 } }),
  },
}));
vi.mock('@/services/store.service', () => ({
  storeService: { list: vi.fn().mockResolvedValue({ items: [], meta: { totalRecords: 0, currentPage: 1, pageSize: 9, totalPages: 1 } }) },
  ownerService: { dashboard: vi.fn().mockResolvedValue({ data: { store: null, stats: { averageRating: null, totalRatings: 0, distribution: [] }, ratings: [] }, meta: { totalRecords: 0, currentPage: 1, pageSize: 10, totalPages: 1 } }) },
}));
// Recharts needs layout APIs jsdom lacks.
vi.mock('@/components/common/DistributionChart', () => ({ DistributionChart: () => <div data-testid="chart" /> }));

describe('route protection', () => {
  it('redirects anonymous visitors to the login page', async () => {
    renderApp(<AppRoutes />, { route: '/admin' });
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });
  it('shows access denied when the role does not match', async () => {
    renderApp(<AppRoutes />, { user: makeUser('USER'), route: '/admin/users' });
    expect(await screen.findByRole('heading', { name: /access denied/i })).toBeInTheDocument();
  });
  it('sends each role to its own home from "/"', async () => {
    renderApp(<AppRoutes />, { user: makeUser('ADMIN'), route: '/' });
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });
  it('store owners cannot open the admin or store directory pages', async () => {
    renderApp(<AppRoutes />, { user: makeUser('STORE_OWNER'), route: '/stores' });
    expect(await screen.findByRole('heading', { name: /access denied/i })).toBeInTheDocument();
  });
  it('logged-in users are redirected away from /login', async () => {
    renderApp(<AppRoutes />, { user: makeUser('USER'), route: '/login' });
    expect(await screen.findByRole('heading', { name: 'Stores' })).toBeInTheDocument();
  });
  it('unknown URLs render the not-found page', async () => {
    renderApp(<AppRoutes />, { route: '/does-not-exist' });
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });
});

describe('role-specific navigation', () => {
  it.each([
    ['ADMIN', ['Dashboard', 'Users', 'Stores', 'Password'], [], '/admin'],
    ['USER', ['Stores', 'Password'], ['Users', 'Dashboard', 'My Store'], '/stores'],
    ['STORE_OWNER', ['My Store', 'Password'], ['Users', 'Stores'], '/owner'],
  ] as const)('%s sees only permitted links', async (role, shown, hidden, route) => {
    renderApp(<AppRoutes />, { user: makeUser(role), route });
    const nav = await screen.findByRole('navigation', { name: /main navigation/i });
    for (const label of shown) expect(nav).toHaveTextContent(label);
    for (const label of hidden) expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
  });
  it('the logout button calls logout', async () => {
    const { auth } = renderApp(<AppRoutes />, { user: makeUser('USER'), route: '/stores' });
    (await screen.findByRole('button', { name: /log out/i })).click();
    await vi.waitFor(() => expect(auth.logout).toHaveBeenCalled());
  });
});
