import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { AuthFrame } from '../components/auth-frame';
import { roleHome } from '../lib/auth-rules';

export function ForbiddenPage() {
  const role = useAuthStore((state) => state.user?.role);

  return (
    <AuthFrame
      title="Không có quyền"
      aside={<p className="auth-note">Tài khoản này không vào được khu vực đang mở.</p>}
    >
      <p>Máy chủ vẫn là nơi quyết định quyền. Màn hình này chỉ chặn đường dẫn.</p>
      {role ? (
        <p className="auth-switch">
          <Link className="auth-link" to={roleHome(role)}>
            Về bàn của bạn
          </Link>
        </p>
      ) : null}
    </AuthFrame>
  );
}
