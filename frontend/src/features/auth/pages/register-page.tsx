import { AuthFrame } from '../components/auth-frame';
import { RegisterForm } from '../components/register-form';
import { UIT_STUDENT_EMAIL_DOMAIN } from '../lib/auth-rules';

export function RegisterPage() {
  return (
    <AuthFrame
      title="Đăng ký"
      aside={
        <>
          <p className="auth-domain">@{UIT_STUDENT_EMAIL_DOMAIN}</p>
          <p className="auth-note">
            Tài khoản mới là sinh viên. Mật khẩu cần chữ và số, từ 8 ký tự. Đăng ký xong thì đăng nhập
            để nhận phiên.
          </p>
        </>
      }
    >
      <RegisterForm />
    </AuthFrame>
  );
}
