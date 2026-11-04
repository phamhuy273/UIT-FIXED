import type { ReactNode } from 'react';

export function TextField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p className="auth-field-error" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
