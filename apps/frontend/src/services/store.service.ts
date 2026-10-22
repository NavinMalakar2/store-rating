import { api } from '@/lib/api';
import { DirectoryStore, OwnerDashboard, Paginated, PageMeta } from '@/types';

type Params = Record<string, string | number | boolean | undefined>;

export const storeService = {
  list: (params: Params, signal?: AbortSignal): Promise<Paginated<DirectoryStore>> =>
    api.get<DirectoryStore[]>('/stores', params, signal).then((r) => ({ items: r.data, meta: r.meta! })),
  submitRating: (storeId: string, rating: number) => api.post<DirectoryStore>(`/stores/${storeId}/ratings`, { rating }).then((r) => r.data),
  updateRating: (storeId: string, rating: number) => api.patch<DirectoryStore>(`/stores/${storeId}/ratings`, { rating }).then((r) => r.data),
};

export const ownerService = {
  dashboard: (params: Params, signal?: AbortSignal): Promise<{ data: OwnerDashboard; meta: PageMeta }> =>
    api.get<OwnerDashboard>('/owner/dashboard', params, signal).then((r) => ({ data: r.data, meta: r.meta! })),
};
