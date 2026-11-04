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
    <div className="ui-field">
      <label htmlFor={inputId}>{label}{required && <span className="required-mark"> *</span>}</label>
      <div className={`ui-input-wrap ${error ? 'has-error' : ''}`}>
        {iconLeft && <span className="input-icon" aria-hidden="true">{iconLeft}</span>}
        <input {...props} ref={ref} id={inputId} required={required}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={[describedBy, message ? messageId : ''].filter(Boolean).join(' ') || undefined}
          className={`ui-input ${className}`} />
        {iconRight && <span className="input-icon">{iconRight}</span>}
      </div>
      {message && <p id={messageId} className={error ? 'field-error' : 'field-helper'} role={error ? 'alert' : undefined}>{message}</p>}
    </div>
  );
});
