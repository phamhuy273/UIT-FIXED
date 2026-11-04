import { Link } from 'react-router-dom';
import { AuthFrame } from '../components/auth-frame';

export function MissingPage() {
  return (
    <AuthFrame
      title="Không có trang này"
      aside={<p className="auth-note">Đường dẫn không tồn tại hoặc đã được thay đổi.</p>}
    >
      <p>Kiểm tra lại địa chỉ, hoặc quay về trang đăng nhập để tiếp tục.</p>
      <div className="auth-actions">
        <Link className="auth-button" to="/login">
          Về đăng nhập
        </Link>
      </div>
    </AuthFrame>
  );
}
