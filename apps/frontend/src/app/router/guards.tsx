import { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '@/components/feedback/States';
import { HOME_BY_ROLE } from '@/constants';
import { Role } from '@/types';
import { useAuth } from '../providers/AuthProvider';

/** Requires a session; optionally restricts to specific roles. (Backend authorization is the real gate.) */
export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingState label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}

/** Keeps signed-in users away from the login / signup pages. */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingState />;
  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return <>{children}</>;
}

export function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingState />;
  return <Navigate to={user ? HOME_BY_ROLE[user.role] : '/login'} replace />;
}
