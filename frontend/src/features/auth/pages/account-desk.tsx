import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { AuthFrame } from '../components/auth-frame';
import { roleLabel } from '../lib/auth-rules';

const copy = {
  student: {
    title: 'Sinh viên',
    note: 'Phiếu sự cố bạn gửi sẽ gắn với tài khoản này.',
  },
  admin: {
    title: 'Quản trị',
    note: 'Khu vực này chỉ mở cho tài khoản quản trị.',
  },
  staff: {
    title: 'Kỹ thuật',
    note: 'Việc được giao cho phòng ban của bạn sẽ nằm ở đây.',
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

  return (
    <AuthFrame title={page.title} aside={<p className="auth-note">{page.note}</p>}>
      <dl className="auth-facts">
        <div>
          <dt>Họ và tên</dt>
          <dd>{user?.fullName || <span className="auth-missing">—</span>}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd className="is-hue">{user?.email}</dd>
        </div>
        <div>
          <dt>Vai trò</dt>
          <dd>{user ? roleLabel(user.role) : <span className="auth-missing">—</span>}</dd>
        </div>
        <div>
          <dt>Mã phòng ban</dt>
          <dd>
            {user?.departmentId ?? <span className="auth-missing">—</span>}
          </dd>
        </div>
        <div>
          <dt>Mở tài khoản</dt>
          <dd>{createdAt}</dd>
        </div>
      </dl>
      <div className="auth-actions">
        <button className="auth-button" type="button" onClick={logout}>
          Đăng xuất
        </button>
      </div>
    </AuthFrame>
  );
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
