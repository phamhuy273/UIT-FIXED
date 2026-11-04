import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({
  label, helperText, error, id, required, iconLeft, iconRight, className = '',
  'aria-describedby': describedBy, ...props
}, ref) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const message = error || helperText;
  const messageId = `${inputId}-message`;
  return (
    <div className="field">
      <label className="field__label" htmlFor={inputId}>
        {label}
        {required && <span className="req">*</span>}
      </label>
      <div className="field__control" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {iconLeft && (
          <span
            className="input-icon"
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 12,
              display: 'inline-flex',
              alignItems: 'center',
              pointerEvents: 'none',
              color: 'var(--text-muted)',
            }}
          >
            {iconLeft}
          </span>
        )}
        <input
          {...props}
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={[describedBy, message ? messageId : ''].filter(Boolean).join(' ') || undefined}
          className={`input ${className}`.trim()}
          style={{
            paddingLeft: iconLeft ? '36px' : undefined,
            paddingRight: iconRight ? '36px' : undefined,
            ...props.style,
          }}
        />
        {iconRight && (
          <span
            className="input-icon"
            style={{
              position: 'absolute',
              right: 12,
              display: 'inline-flex',
              alignItems: 'center',
              pointerEvents: 'none',
              color: 'var(--text-muted)',
            }}
          >
            {iconRight}
          </span>
        )}
      </div>
      {message && (
        <p
          id={messageId}
          className={error ? 'field__error' : 'field__hint'}
          role={error ? 'alert' : undefined}
          style={{ margin: 0, marginTop: '2px' }}
        >
          {message}
        </p>
      )}
    </div>
  );
});
