import { useState, type FormEvent } from 'react';
import { Link, NavLink } from 'react-router-dom';
import eye from '../assets/eye.svg';
import { registerRequest } from '../api/auth.api';
import { readErrorMessage } from '../lib/api-error';
import {
  UIT_STUDENT_EMAIL_DOMAIN,
  composeStudentEmail,
  emailError,
  fullNameError,
  passwordError,
  studentLocalPart,
} from '../lib/auth-rules';

export function RegisterForm() {
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [localPart, setLocalPart] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visible, setVisible] = useState({ password: false, confirm: false });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const strength = passwordStrength(password);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    const email = composeStudentEmail(localPart || studentId);
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
      <div className="gate-form is-register">
        <h1>Tạo tài khoản sinh viên</h1>
        <p className="gate-success" role="status">
          {success}
        </p>
        <Link className="gate-submit" to="/login">
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  return (
    <form className="gate-form is-register" onSubmit={onSubmit} noValidate>
      <h1>Tạo tài khoản sinh viên</h1>
      <p className="gate-lede">Hệ thống sự cố cơ sở vật chất dành cho UIT.</p>
      <div className="gate-tabs">
        <NavLink className={({ isActive }) => `gate-tab${isActive ? ' is-active' : ''}`} to="/login">
          Đăng nhập
        </NavLink>
        <NavLink className={({ isActive }) => `gate-tab${isActive ? ' is-active' : ''}`} to="/register">
          Đăng ký
        </NavLink>
      </div>
      <div className="gate-fields">
        <div className="gate-row">
          <label className="gate-field" htmlFor="register-name">
            <span>Họ và tên</span>
            <span className="gate-control">
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
            </span>
          </label>
          <label className="gate-field" htmlFor="register-student-id">
            <span>MSSV</span>
            <span className="gate-control">
              <input
                id="register-student-id"
                name="studentId"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
              />
            </span>
          </label>
        </div>
        {fieldErrors.fullName ? (
          <p className="gate-error" id="register-name-error">
            {fieldErrors.fullName}
          </p>
        ) : null}
        <label className="gate-field" htmlFor="register-email">
          <span>Email sinh viên</span>
          <span className="gate-control">
            <input
              id="register-email"
              name="email"
              type="text"
              autoComplete="username"
              inputMode="email"
              value={localPart}
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
              onChange={(event) => setLocalPart(studentLocalPart(event.target.value))}
            />
            <span className="gate-domain">@{UIT_STUDENT_EMAIL_DOMAIN}</span>
          </span>
        </label>
        {fieldErrors.email ? (
          <p className="gate-error" id="register-email-error">
            {fieldErrors.email}
          </p>
        ) : null}
        <label className="gate-field gate-phone" htmlFor="register-phone">
          <span>Số điện thoại</span>
          <span className="gate-control">
            <input
              id="register-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </span>
        </label>
        <div className="gate-row">
          <PasswordField
            id="register-password"
            label="Mật khẩu"
            autoComplete="new-password"
            value={password}
            visible={visible.password}
            error={fieldErrors.password}
            errorId="register-password-error"
            onChange={setPassword}
            onToggle={() => setVisible((current) => ({ ...current, password: !current.password }))}
          />
          <PasswordField
            id="register-confirm"
            label="Nhập lại mật khẩu"
            autoComplete="new-password"
            value={confirmPassword}
            visible={visible.confirm}
            error={fieldErrors.confirmPassword}
            errorId="register-confirm-error"
            onChange={setConfirmPassword}
            onToggle={() => setVisible((current) => ({ ...current, confirm: !current.confirm }))}
          />
        </div>
        <div className="gate-meter" aria-hidden="true">
          {[0, 1, 2, 3].map((segment) => (
            <i key={segment} className={segment < strength ? 'is-on' : undefined} />
          ))}
        </div>
        <p className="gate-hint">
          {strength >= 3 ? 'Mật khẩu mạnh · Tối thiểu 8 ký tự' : 'Tối thiểu 8 ký tự, gồm chữ và số'}
        </p>
      </div>
      {formError ? (
        <p className="gate-alert" role="alert">
          {formError}
        </p>
      ) : null}
      <button className="gate-submit" type="submit" disabled={pending}>
        {pending ? 'Đang đăng ký' : 'Đăng ký tài khoản'}
      </button>
      <p className="gate-switch">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </form>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  visible,
  error,
  errorId,
  onChange,
  onToggle,
}: {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  visible: boolean;
  error?: string;
  errorId: string;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <label className="gate-field" htmlFor={id}>
      <span>{label}</span>
      <span className="gate-control">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          className="gate-eye"
          type="button"
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
          onClick={onToggle}
        >
          <img src={eye} alt="" />
        </button>
      </span>
      {error ? (
        <p className="gate-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </label>
  );
}

function passwordStrength(password: string): number {
  if (!password) {
    return 0;
  }
  if (passwordError(password)) {
    return password.length >= 8 ? 2 : 1;
  }
  return password.length >= 12 ? 4 : 3;
}
