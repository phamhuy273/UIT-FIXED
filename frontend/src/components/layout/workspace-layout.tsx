import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { MainLayout } from './main-layout';
import { LayoutDashboard, Inbox, FilePlus2, FileText, User, LogOut, Wrench, Tags } from 'lucide-react';
import { roleLabel } from '@/features/auth/lib/auth-rules';

export function WorkspaceLayout({ scope }: { scope: 'student' | 'admin' | 'staff' }) {
  const navigate = useNavigate();
  const route = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  let items = [
    { id: '/', label: 'Báo cáo của tôi', icon: <FileText size={18} strokeWidth={1.75} /> },
    { id: '/reports/new', label: 'Báo cáo mới', icon: <FilePlus2 size={18} strokeWidth={1.75} /> },
    { id: '/account', label: 'Tài khoản', icon: <User size={18} strokeWidth={1.75} /> },
  ];

  if (scope === 'admin') {
    items = [
      { id: '/admin', label: 'Tổng quan', icon: <LayoutDashboard size={18} strokeWidth={1.75} /> },
      { id: '/admin/queue', label: 'Hàng đợi chờ duyệt', icon: <Inbox size={18} strokeWidth={1.75} /> },
      { id: '/admin/categories', label: 'Danh mục sự cố', icon: <Tags size={18} strokeWidth={1.75} /> },
      { id: '/admin/account', label: 'Tài khoản', icon: <User size={18} strokeWidth={1.75} /> },
    ];
  } else if (scope === 'staff') {
    items = [
      { id: '/staff', label: 'Công việc kỹ thuật', icon: <Wrench size={18} strokeWidth={1.75} /> },
      { id: '/staff/account', label: 'Tài khoản', icon: <User size={18} strokeWidth={1.75} /> },
    ];
  }

  const currentTitle = items.find((item) => item.id === route.pathname)?.label ?? 'UIT-FIXED';
  const displayName = user?.fullName || user?.email || 'Người dùng';
  const initial = user?.fullName
    ? user.fullName.trim().split(' ').pop()?.charAt(0).toUpperCase() || 'U'
    : (user?.email?.charAt(0).toUpperCase() ?? 'U');

  return (
    <MainLayout
      items={items}
      activeItem={route.pathname}
      onNavigate={navigate}
      title={currentTitle}
      userName={user?.fullName ?? user?.email}
      userRole={user ? roleLabel(user.role) : undefined}
      actions={
        <div className="topbar__right">
          <div className="topbar__user">
            <span className="avatar avatar--sm">{initial}</span>
            <span className="topbar__name">{displayName}</span>
          </div>
          <span className="topbar__divider" aria-hidden="true" />
          <button
            type="button"
            className="btn btn--secondary btn--sm topbar__logout"
            onClick={() => {
              clearSession();
              queryClient.clear();
              navigate('/login', { replace: true });
            }}
          >
            <LogOut size={16} strokeWidth={1.75} />
            <span>Đăng xuất</span>
          </button>
        </div>
      }
    >
      <Outlet />
    </MainLayout>
  );
}
