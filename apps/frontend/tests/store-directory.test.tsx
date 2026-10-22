import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoreDirectoryPage } from '@/features/stores/StoreDirectoryPage';
import { ApiError } from '@/lib/api';
import { storeService } from '@/services/store.service';
import { DirectoryStore } from '@/types';
import { makeUser, renderApp } from './utils';

vi.mock('@/services/store.service', () => ({ storeService: { list: vi.fn(), submitRating: vi.fn(), updateRating: vi.fn() }, ownerService: {} }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() }, Toaster: () => null }));

const meta = { totalRecords: 2, currentPage: 1, pageSize: 9, totalPages: 1 };
const unrated: DirectoryStore = { id: 's1', name: 'Alpha Hardware Superstore Ltd', address: '1 Mumbai Road', averageRating: null, ratingCount: 0, myRating: null };
const rated: DirectoryStore = { id: 's2', name: 'Bravo Bakery And Cafe Limited', address: '2 Delhi Road', averageRating: 4.5, ratingCount: 2, myRating: 3 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(storeService.list).mockResolvedValue({ items: [unrated, rated], meta });
});

const card = async (name: string) => within((await screen.findByRole('heading', { name })).closest('[data-testid="store-card"]') as HTMLElement);

describe('StoreDirectoryPage', () => {
  it('shows overall and own ratings, with a clear "Not rated yet" state', async () => {
    renderApp(<StoreDirectoryPage />, { user: makeUser('USER') });
    const a = await card(unrated.name);
    expect(a.getByText('Not rated yet')).toBeInTheDocument();
    expect(a.getByText('Not rated by you')).toBeInTheDocument();
    expect(a.getByRole('button', { name: 'Submit rating' })).toBeDisabled(); // no hard-coded default rating
    const b = await card(rated.name);
    expect(b.getByText('4.50')).toBeInTheDocument();
    expect(b.getAllByText('3 / 5')).toHaveLength(2); // summary + selector label
    expect(b.getByRole('button', { name: 'Update rating' })).toBeDisabled(); // nothing changed yet
  });
  it('searches through the backend (debounced) and resets to page 1', async () => {
    renderApp(<StoreDirectoryPage />, { user: makeUser('USER') });
    await screen.findByText(unrated.name);
    await userEvent.type(screen.getByLabelText('Search stores'), 'bakery');
    await waitFor(() => expect(storeService.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'bakery', page: 1 }), expect.anything()));
  });
  it('submits a new rating via POST and refreshes from the server', async () => {
    vi.mocked(storeService.submitRating).mockResolvedValue({ ...unrated, myRating: 4, averageRating: 4, ratingCount: 1 });
    renderApp(<StoreDirectoryPage />, { user: makeUser('USER') });
    const a = await card(unrated.name);
    await userEvent.click(a.getByRole('radio', { name: '4 stars' }));
    await userEvent.click(a.getByRole('button', { name: 'Submit rating' }));
    await waitFor(() => expect(storeService.submitRating).toHaveBeenCalledWith('s1', 4));
    await waitFor(() => expect(vi.mocked(storeService.list).mock.calls.length).toBeGreaterThan(1)); // invalidated + refetched
    expect(storeService.updateRating).not.toHaveBeenCalled();
  });
  it('modifies an existing rating via PATCH', async () => {
    vi.mocked(storeService.updateRating).mockResolvedValue({ ...rated, myRating: 5 });
    renderApp(<StoreDirectoryPage />, { user: makeUser('USER') });
    const b = await card(rated.name);
    await userEvent.click(b.getByRole('radio', { name: '5 stars' }));
    await userEvent.click(b.getByRole('button', { name: 'Update rating' }));
    await waitFor(() => expect(storeService.updateRating).toHaveBeenCalledWith('s2', 5));
    expect(storeService.submitRating).not.toHaveBeenCalled();
  });
  it('does not change the displayed rating when the backend rejects the save', async () => {
    vi.mocked(storeService.submitRating).mockRejectedValue(new ApiError(409, 'You have already rated this store.'));
    renderApp(<StoreDirectoryPage />, { user: makeUser('USER') });
    const a = await card(unrated.name);
    await userEvent.click(a.getByRole('radio', { name: '2 stars' }));
    await userEvent.click(a.getByRole('button', { name: 'Submit rating' }));
    await waitFor(() => expect(storeService.submitRating).toHaveBeenCalled());
    expect((await card(unrated.name)).getByText('Not rated by you')).toBeInTheDocument();
  });
  it('shows an error state with retry (never fake data) when the API fails', async () => {
    vi.mocked(storeService.list).mockRejectedValue(new ApiError(0, 'Unable to reach the server.'));
    renderApp(<StoreDirectoryPage />, { user: makeUser('USER') });
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server.');
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByTestId('store-card')).not.toBeInTheDocument();
  });
  it('shows empty states for no stores / no search matches', async () => {
    vi.mocked(storeService.list).mockResolvedValue({ items: [], meta: { ...meta, totalRecords: 0 } });
    renderApp(<StoreDirectoryPage />, { user: makeUser('USER') });
    expect(await screen.findByText('No stores registered yet')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Search stores'), 'zzz');
    expect(await screen.findByText('No stores match your search')).toBeInTheDocument();
  });
});
