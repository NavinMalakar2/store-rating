import { api } from '@/lib/api';
import { AuthUser } from '@/types';

export const authService = {
  me: () => api.get<AuthUser>('/auth/me').then((r) => r.data),
  login: (body: { email: string; password: string }) => api.post<AuthUser>('/auth/login', body).then((r) => r.data),
  register: (body: { name: string; email: string; address: string; password: string }) => api.post<AuthUser>('/auth/register', body).then((r) => r.data),
  logout: () => api.post<null>('/auth/logout').then((r) => r.data),
  changePassword: (body: { currentPassword: string; newPassword: string }) => api.patch<null>('/auth/password', body).then((r) => r.message),
};
