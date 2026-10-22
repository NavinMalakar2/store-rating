import { api } from '@/lib/api';
import { AdminDashboard, AdminStore, AdminUser, AdminUserDetail, Paginated } from '@/types';

type Params = Record<string, string | number | boolean | undefined>;
const paged = <T>(path: string, params: Params, signal?: AbortSignal): Promise<Paginated<T>> =>
  api.get<T[]>(path, params, signal).then((r) => ({ items: r.data, meta: r.meta! }));

export const adminService = {
  dashboard: () => api.get<AdminDashboard>('/admin/dashboard').then((r) => r.data),
  users: (params: Params, signal?: AbortSignal) => paged<AdminUser>('/admin/users', params, signal),
  user: (id: string) => api.get<AdminUserDetail>(`/admin/users/${id}`).then((r) => r.data),
  createUser: (body: unknown) => api.post<AdminUserDetail>('/admin/users', body).then((r) => r.data),
  stores: (params: Params, signal?: AbortSignal) => paged<AdminStore>('/admin/stores', params, signal),
  createStore: (body: unknown) => api.post<AdminStore>('/admin/stores', body).then((r) => r.data),
  updateStore: (id: string, body: unknown) => api.patch<AdminStore>(`/admin/stores/${id}`, body).then((r) => r.data),
};
