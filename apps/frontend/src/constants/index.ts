import { Role } from '@/types';

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  USER: 'Normal User',
  STORE_OWNER: 'Store Owner',
};

export const HOME_BY_ROLE: Record<Role, string> = {
  ADMIN: '/admin',
  USER: '/stores',
  STORE_OWNER: '/owner',
};

export const PAGE_SIZE_OPTIONS = [10, 20, 50];
