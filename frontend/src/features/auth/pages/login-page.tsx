import { GateShell } from '../components/gate-shell';
import { LoginForm } from '../components/login-form';

export function LoginPage() {
  return (
    <GateShell title="Đăng nhập vào tài khoản của bạn">
      <LoginForm />
    </GateShell>
  );
}
