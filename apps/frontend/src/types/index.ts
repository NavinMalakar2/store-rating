export type Role = 'ADMIN' | 'USER' | 'STORE_OWNER';
export type SortOrder = 'asc' | 'desc';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  address: string;
  role: Role;
  createdAt: string;
}

export interface PageMeta {
  totalRecords: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

export interface DirectoryStore {
  id: string;
  name: string;
  address: string;
  averageRating: number | null;
  ratingCount: number;
  myRating: number | null;
}

export interface AdminStore {
  id: string;
  name: string;
  email: string;
  address: string;
  averageRating: number | null;
  ratingCount: number;
  createdAt: string;
  owner: { id: string; name: string | null; email: string | null } | null;
}

export interface AdminUser extends AuthUser {
  store: { id: string; name: string } | null;
}

export interface AdminUserDetail extends AuthUser {
  store: { id: string; name: string; email: string; address: string; averageRating: number | null; ratingCount: number } | null;
}

export interface Distribution { rating: number; count: number }

export interface AdminDashboard {
  totalUsers: number;
  totalStores: number;
  totalRatings: number;
  averageRating: number | null;
  ratingDistribution: Distribution[];
  usersByRole: { role: Role; count: number }[];
}

export interface OwnerRating {
  id: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string };
}

export interface OwnerDashboard {
  store: { id: string; name: string; email: string; address: string } | null;
  stats: { averageRating: number | null; totalRatings: number; distribution: Distribution[] };
  ratings: OwnerRating[];
}
