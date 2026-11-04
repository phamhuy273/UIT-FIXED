import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { registerRequest } from '../api/auth.api';
import { readErrorMessage } from '../lib/api-error';
import { emailError, fullNameError, passwordError } from '../lib/auth-rules';
import { TextField } from './text-field';

export function RegisterForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    const nextErrors: Record<string, string | undefined> = {
      fullName: fullNameError(fullName) ?? undefined,
      email: emailError(email) ?? undefined,
      password: passwordError(password) ?? undefined,
      confirmPassword: password === confirmPassword ? undefined : 'Mật khẩu xác nhận không khớp.',
    };
    setFieldErrors(nextErrors);
    setFormError(null);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setPending(true);
    try {
      const result = await registerRequest({ fullName, email, password });
      setPassword('');
      setConfirmPassword('');
      setSuccess(result.message);
    } catch (error) {
      setFormError(readErrorMessage(error, 'Không đăng ký được tài khoản.'));
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div>
        <p role="status">{success}</p>
        <p className="auth-switch">
          <Link className="auth-link" to="/login">
            Đăng nhập
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <TextField id="register-name" label="Họ và tên" error={fieldErrors.fullName}>
        <input
          id="register-name"
          name="fullName"
          type="text"
          autoComplete="name"
          value={fullName}
          aria-invalid={fieldErrors.fullName ? true : undefined}
          aria-describedby={fieldErrors.fullName ? 'register-name-error' : undefined}
          onChange={(event) => setFullName(event.target.value)}
        />
      </TextField>
      <TextField id="register-email" label="Email UIT" error={fieldErrors.email}>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
          onChange={(event) => setEmail(event.target.value)}
        />
      </TextField>
      <TextField id="register-password" label="Mật khẩu" error={fieldErrors.password}>
        <input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          aria-invalid={fieldErrors.password ? true : undefined}
          aria-describedby={fieldErrors.password ? 'register-password-error' : undefined}
          onChange={(event) => setPassword(event.target.value)}
        />
      </TextField>
      <TextField id="register-confirm" label="Xác nhận mật khẩu" error={fieldErrors.confirmPassword}>
        <input
          id="register-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          aria-invalid={fieldErrors.confirmPassword ? true : undefined}
          aria-describedby={fieldErrors.confirmPassword ? 'register-confirm-error' : undefined}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </TextField>
      {formError ? (
        <p className="auth-alert" role="alert">
          {formError}
        </p>
      ) : null}
      <button className="auth-button" type="submit" disabled={pending}>
        {pending ? 'Đang đăng ký' : 'Đăng ký'}
      </button>
      <p className="auth-switch">
        Đã có tài khoản?{' '}
        <Link className="auth-link" to="/login">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
