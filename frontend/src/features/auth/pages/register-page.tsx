import { GateShell } from '../components/gate-shell';
import { RegisterForm } from '../components/register-form';

export function RegisterPage() {
  return (
    <GateShell title="Đăng ký tài khoản sinh viên">
      <RegisterForm />
    </GateShell>
  );
}
