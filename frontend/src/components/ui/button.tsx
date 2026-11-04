import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = 'primary', size = 'md', loading = false, disabled, type = 'button',
  iconLeft, iconRight, className = '', children, ...props
}, ref) {
  return (
    <button {...props} ref={ref} type={type} disabled={disabled || loading}
      aria-busy={loading || undefined} className={`ui-button ui-button--${variant} ui-button--${size} ${className}`}>
      {loading ? <span className="spinner" aria-hidden="true" /> : iconLeft}
      {children}
      {iconRight}
    </button>
  );
});
