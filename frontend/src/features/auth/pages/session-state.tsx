import { useAuthStore } from '@/stores/auth.store';
import { AuthFrame } from '../components/auth-frame';

export function SessionPending() {
  return (
    <AuthFrame title="Đang kiểm tra phiên">
      <p className="auth-note">Đối chiếu token với tài khoản trên máy chủ.</p>
      <div className="auth-loading-bar" />
    </AuthFrame>
  );
}

export function SessionError() {
  const retry = useAuthStore((state) => state.retry);
  const clearSession = useAuthStore((state) => state.clearSession);

  return (
    <AuthFrame title="Chưa kiểm tra được phiên">
      <p className="auth-alert" role="alert">
        Không tải được tài khoản. Phiên lưu trên máy vẫn còn.
      </p>
      <div className="auth-actions">
        <button className="auth-button" type="button" onClick={() => void retry()}>
          Thử lại
        </button>
      </div>
      <p className="auth-switch">
        <button className="auth-text-button" type="button" onClick={clearSession}>
          Đăng nhập tài khoản khác
        </button>
      </p>
    </AuthFrame>
  );
}
