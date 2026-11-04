import { Link } from 'react-router-dom';
import { AuthFrame } from '../components/auth-frame';

export function MissingPage() {
  return (
    <AuthFrame title="Không có trang này">
      <p>
        <Link className="auth-link" to="/login">
          Về đăng nhập
        </Link>
      </p>
    </AuthFrame>
  );
}
