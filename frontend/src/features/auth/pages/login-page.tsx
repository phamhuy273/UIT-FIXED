import { AuthFrame } from '../components/auth-frame';
import { LoginForm } from '../components/login-form';
import { UIT_STUDENT_EMAIL_DOMAIN } from '../lib/auth-rules';

export function LoginPage() {
  return (
    <AuthFrame
      title="Đăng nhập"
      aside={
        <>
          <p className="auth-domain">@{UIT_STUDENT_EMAIL_DOMAIN}</p>
          <p className="auth-note">Chỉ email sinh viên UIT mở được phiên làm việc.</p>
        </>
      }
    >
      <LoginForm />
    </AuthFrame>
  );
}
