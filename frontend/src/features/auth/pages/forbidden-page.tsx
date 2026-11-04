import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { AuthFrame } from '../components/auth-frame';
import { roleHome } from '../lib/auth-rules';

export function ForbiddenPage() {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.user?.role);
  const clearSession = useAuthStore((state) => state.clearSession);

  function switchAccount() {
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <AuthFrame
      title="Không có quyền"
      aside={<p className="auth-note">Tài khoản này không vào được khu vực đang mở.</p>}
    >
      <p>Nếu bạn cần vào khu vực này, hãy đăng nhập bằng tài khoản có vai trò phù hợp.</p>
      {role ? (
        <div className="auth-actions">
          <Link className="auth-button" to={roleHome(role)}>
            Về trang của bạn
          </Link>
        </div>
      ) : null}
      <p className="auth-switch">
        <button className="auth-text-button" type="button" onClick={switchAccount}>
          Đăng nhập tài khoản khác
        </button>
      </p>
    </AuthFrame>
  );
}
