import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/ui/page-header';
import { roleLabel } from '../lib/auth-rules';
import { LogOut } from 'lucide-react';

const copy = {
  student: {
    note: 'Phiếu sự cố bạn gửi sẽ gắn với thông tin tài khoản này.',
  },
  admin: {
    note: 'Tài khoản quản trị cơ sở vật chất hệ thống UIT-FIXED.',
  },
  staff: {
    note: 'Việc được giao cho phòng ban của bạn sẽ gắn với tài khoản này.',
  },
} as const;

export function AccountDesk({ scope }: { scope: keyof typeof copy }) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const page = copy[scope];

  function logout() {
    clearSession();
    navigate('/login', { replace: true });
  }

  const createdAt = user ? formatCreatedAt(user.createdAt) : '—';
  const initial = user?.fullName
    ? user.fullName.trim().split(' ').pop()?.charAt(0).toUpperCase() || 'U'
    : (user?.email?.charAt(0).toUpperCase() ?? 'U');

  return (
    <div className="page page--account">
      <PageHeader
        title="Tài khoản"
        description={page.note}
      />

      <div className="card profile">
        <div className="avatar avatar--lg">{initial}</div>
        <div>
          <h2>{user?.fullName || 'Người dùng UIT'}</h2>
          <p className="text-muted">{user?.email || '—'}</p>
        </div>
        <span className="badge badge--neutral">
          {user ? roleLabel(user.role) : '—'}
        </span>
      </div>

      <div className="card" style={{ padding: '24px 32px' }}>
        <dl className="detail">
          <div>
            <dt>Vai trò</dt>
            <dd>
              <span className="badge badge--neutral">
                {user ? roleLabel(user.role) : '—'}
              </span>
            </dd>
          </div>
          <div>
            <dt>Mã phòng ban</dt>
            <dd className="text-muted">{user?.departmentId ?? 'Không trực thuộc (SV/Admin)'}</dd>
          </div>
          <div>
            <dt>Mở tài khoản</dt>
            <dd className="num">{createdAt}</dd>
          </div>
        </dl>

        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-start' }}>
          <button className="btn btn--secondary btn--sm" type="button" onClick={logout}>
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}
