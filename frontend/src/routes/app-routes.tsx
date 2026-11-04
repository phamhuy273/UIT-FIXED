import { createBrowserRouter } from 'react-router-dom';
import { AccountDesk } from '@/features/auth/pages/account-desk';
import { LoginPage } from '@/features/auth/pages/login-page';
import { MissingPage } from '@/features/auth/pages/missing-page';
import { RegisterPage } from '@/features/auth/pages/register-page';
import { MediaPage } from '@/features/media/media-page';
import { GuestRoute, ProtectedRoute } from './protected-route';

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute allow={['STUDENT', 'ADMIN']} />,
    children: [{ path: '/', element: <AccountDesk scope="student" /> }],
  },
  {
    element: <ProtectedRoute allow={['ADMIN']} />,
    children: [{ path: '/admin', element: <AccountDesk scope="admin" /> }],
  },
  {
    element: <ProtectedRoute allow={['TECH_STAFF']} />,
    children: [{ path: '/staff', element: <AccountDesk scope="staff" /> }],
  },
  { path: '/media', element: <MediaPage /> },
  { path: '*', element: <MissingPage /> },
]);
