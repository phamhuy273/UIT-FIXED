import { Navigate, Outlet } from 'react-router-dom';
import { roleHome } from '@/features/auth/lib/auth-rules';
import { ForbiddenPage } from '@/features/auth/pages/forbidden-page';
import { SessionError, SessionPending } from '@/features/auth/pages/session-state';
import type { Role } from '@/features/auth/types/auth.types';
import { useAuthStore } from '@/stores/auth.store';

export function ProtectedRoute({ allow }: { allow: Role[] }) {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.user?.role);

  if (status === 'loading') {
    return <SessionPending />;
  }
  if (status === 'error') {
    return <SessionError />;
  }
  if (status !== 'authenticated' || !role) {
    return <Navigate to="/login" replace />;
  }
  if (!allow.includes(role)) {
    return <ForbiddenPage />;
  }
  return <Outlet />;
}

export function GuestRoute() {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.user?.role);

  if (status === 'loading') {
    return <SessionPending />;
  }
  if (status === 'error') {
    return <SessionError />;
  }
  if (status === 'authenticated' && role) {
    return <Navigate to={roleHome(role)} replace />;
  }
  return <Outlet />;
}
