import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { LoadingState } from '@/components/feedback/States';
import { ChangePasswordPage } from '@/features/account/ChangePasswordPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { SignupPage } from '@/features/auth/SignupPage';
import { StoreDirectoryPage } from '@/features/stores/StoreDirectoryPage';
import { AppLayout } from '../layouts/AppLayout';
import { NotFoundPage, UnauthorizedPage } from './ErrorPages';
import { HomeRedirect, ProtectedRoute, PublicOnly } from './guards';

const AdminDashboardPage = lazy(() => import('@/features/admin-dashboard/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const OwnerDashboardPage = lazy(() => import('@/features/owner-dashboard/OwnerDashboardPage').then((m) => ({ default: m.OwnerDashboardPage })));
const AdminStoresPage = lazy(() => import('@/features/stores/AdminStoresPage').then((m) => ({ default: m.AdminStoresPage })));
const UsersPage = lazy(() => import('@/features/users/UsersPage').then((m) => ({ default: m.UsersPage })));

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingState />}>
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/signup" element={<PublicOnly><SignupPage /></PublicOnly>} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/account/password" element={<ChangePasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/stores" element={<AdminStoresPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['USER']} />}>
            <Route path="/stores" element={<StoreDirectoryPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['STORE_OWNER']} />}>
            <Route path="/owner" element={<OwnerDashboardPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  );
}
