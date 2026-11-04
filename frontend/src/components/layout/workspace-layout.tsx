import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '../ui/button';
import { MainLayout } from './main-layout';

export function WorkspaceLayout({ scope }: { scope: 'student' | 'admin' }) {
  const navigate = useNavigate();
  const route = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const items = scope === 'admin' ? [
    { id: '/admin', label: 'Hàng đợi chờ duyệt', icon: '▤' },
    { id: '/admin/account', label: 'Tài khoản', icon: '○' },
  ] : [
    { id: '/', label: 'Báo cáo của tôi', icon: '▤' },
    { id: '/reports/new', label: 'Báo cáo mới', icon: '+' },
    { id: '/account', label: 'Tài khoản', icon: '○' },
  ];
  return <MainLayout items={items} activeItem={route.pathname} onNavigate={navigate}
    title={items.find((item) => item.id === route.pathname)?.label ?? 'UIT-FIXED'}
    actions={<><span className="workspace-user">{user?.fullName ?? user?.email}</span><Button variant="outline" size="sm" onClick={() => { clearSession(); queryClient.clear(); navigate('/login', { replace: true }); }}>Đăng xuất</Button></>}>
    <Outlet />
  </MainLayout>;
}
