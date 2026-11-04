import { useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import eye from '../assets/eye.svg';
import { loginRequest } from '../api/auth.api';
import { readErrorMessage } from '../lib/api-error';
import {
  UIT_STUDENT_EMAIL_DOMAIN,
  composeStudentEmail,
  loginEmailError,
  roleHome,
} from '../lib/auth-rules';

export function LoginForm() {
  const navigate = useNavigate();
  const establishSession = useAuthStore((state) => state.establishSession);
  const [localPart, setLocalPart] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    const email = composeStudentEmail(localPart);
    const nextErrors = {
      email: loginEmailError(email) ?? undefined,
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
    <form className="gate-form" onSubmit={onSubmit} noValidate>
      <div className="gate-tabs">
        <NavLink className={({ isActive }) => `gate-tab${isActive ? ' is-active' : ''}`} to="/login">
          Đăng nhập
        </NavLink>
        <NavLink className={({ isActive }) => `gate-tab${isActive ? ' is-active' : ''}`} to="/register">
          Đăng ký
        </NavLink>
      </div>
      <div className="gate-fields">
        <label className="gate-field" htmlFor="login-email">
          <span>Tài khoản / Email</span>
          <span className="gate-control">
            <input
              id="login-email"
              name="email"
              type="text"
              autoComplete="username"
              inputMode="email"
              placeholder="MSSV hoặc Email"
              value={localPart}
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
              onChange={(event) => setLocalPart(event.target.value)}
            />
            {!localPart.includes('@') ? (
              <span className="gate-domain">@{UIT_STUDENT_EMAIL_DOMAIN}</span>
            ) : null}
          </span>
        </label>
        {fieldErrors.email ? (
          <p className="gate-error" id="login-email-error">
            {fieldErrors.email}
          </p>
        ) : null}
        <label className="gate-field" htmlFor="login-password">
          <span>Mật khẩu</span>
          <span className="gate-control">
            <input
              id="login-password"
              name="password"
              type={passwordVisible ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
              value={password}
              aria-invalid={fieldErrors.password ? true : undefined}
              aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              className="gate-eye"
              type="button"
              aria-label={passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              aria-pressed={passwordVisible}
              onClick={() => setPasswordVisible((visible) => !visible)}
            >
              <img src={eye} alt="" />
            </button>
          </span>
        </label>
        {fieldErrors.password ? (
          <p className="gate-error" id="login-password-error">
            {fieldErrors.password}
          </p>
        ) : null}
        <div className="gate-options">
          <label className="gate-remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Ghi nhớ tôi</span>
          </label>
          <span className="gate-forgot">Quên mật khẩu?</span>
        </div>
      </div>
      {formError ? (
        <p className="gate-alert" role="alert">
          {formError}
        </p>
      ) : null}
      <button className="gate-submit" type="submit" disabled={pending}>
        {pending ? 'Đang đăng nhập' : 'Đăng nhập'}
      </button>
      <p className="gate-switch">
        Chưa có tài khoản? <Link to="/register">Đăng ký sinh viên</Link>
      </p>
    </form>
  );
}
