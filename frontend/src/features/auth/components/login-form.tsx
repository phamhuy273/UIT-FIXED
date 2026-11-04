import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { loginRequest } from '../api/auth.api';
import { readErrorMessage } from '../lib/api-error';
import { emailError, roleHome } from '../lib/auth-rules';
import { TextField } from './text-field';

export function LoginForm() {
  const navigate = useNavigate();
  const establishSession = useAuthStore((state) => state.establishSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    const nextErrors = {
      email: emailError(email) ?? undefined,
      password: password ? undefined : 'Nhập mật khẩu.',
    };
    setFieldErrors(nextErrors);
    setFormError(null);
    if (nextErrors.email || nextErrors.password) {
      return;
    }

    setPending(true);
    try {
      const result = await loginRequest(email, password);
      establishSession(result.accessToken, result.user);
      navigate(roleHome(result.user.role), { replace: true });
    } catch (error) {
      setFormError(readErrorMessage(error, 'Email hoặc mật khẩu không đúng.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <TextField id="login-email" label="Email UIT" error={fieldErrors.email}>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
          onChange={(event) => setEmail(event.target.value)}
        />
      </TextField>
      <TextField id="login-password" label="Mật khẩu" error={fieldErrors.password}>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          aria-invalid={fieldErrors.password ? true : undefined}
          aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
          onChange={(event) => setPassword(event.target.value)}
        />
      </TextField>
      {formError ? (
        <p className="auth-alert" role="alert">
          {formError}
        </p>
      ) : null}
      <button className="auth-button" type="submit" disabled={pending}>
        {pending ? 'Đang đăng nhập' : 'Đăng nhập'}
      </button>
      <p className="auth-switch">
        Chưa có tài khoản?{' '}
        <Link className="auth-link" to="/register">
          Đăng ký
        </Link>
      </p>
    </form>
  );
}
