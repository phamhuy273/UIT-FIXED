import { createBrowserRouter } from 'react-router-dom';
import { AccountDesk } from '@/features/auth/pages/account-desk';
import { LoginPage } from '@/features/auth/pages/login-page';
import { MissingPage } from '@/features/auth/pages/missing-page';
import { RegisterPage } from '@/features/auth/pages/register-page';
import { MediaPage } from '@/features/media/media-page';
import { GuestRoute, ProtectedRoute } from './protected-route';
import { WorkspaceLayout } from '@/components/layout/workspace-layout';
import { ReportForm, ReportList } from '@/features/incident-reports';
import { PendingQueueTable } from '@/features/admin';
import { StaffWorkspace } from '@/features/staff/components/staff-workspace';

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute allow={['STUDENT']} />,
    children: [{ element: <WorkspaceLayout scope="student" />, children: [
      { path: '/', element: <ReportList /> },
      { path: '/reports/new', element: <ReportForm /> },
      { path: '/account', element: <AccountDesk scope="student" /> },
    ] }],
  },
  {
    element: <ProtectedRoute allow={['ADMIN']} />,
    children: [{ element: <WorkspaceLayout scope="admin" />, children: [
      { path: '/admin', lazy: async () => ({ Component: (await import('@/features/admin/components/admin-dashboard')).AdminDashboard }) },
      { path: '/admin/queue', element: <PendingQueueTable /> },
      { path: '/admin/categories', lazy: async () => ({ Component: (await import('@/features/admin/components/category-manager')).CategoryManager }) },
      { path: '/admin/departments', lazy: async () => ({ Component: (await import('@/features/admin/components/department-manager')).DepartmentManager }) },
      { path: '/admin/students', lazy: async () => ({ Component: (await import('@/features/admin/components/student-manager')).StudentManager }) },
      { path: '/admin/staff', lazy: async () => ({ Component: (await import('@/features/admin/components/staff-manager')).StaffManager }) },
      { path: '/admin/account', element: <AccountDesk scope="admin" /> },
    ] }],
  },
  {
    element: <ProtectedRoute allow={['TECH_STAFF']} />,
    children: [{ element: <WorkspaceLayout scope="staff" />, children: [
      { path: '/staff', element: <StaffWorkspace /> },
      { path: '/staff/account', element: <AccountDesk scope="staff" /> },
    ] }],
  },
  { element: <ProtectedRoute allow={['STUDENT', 'ADMIN', 'TECH_STAFF']} />, children: [{ path: '/media', element: <MediaPage /> }] },
  { path: '*', element: <MissingPage /> },
]);
