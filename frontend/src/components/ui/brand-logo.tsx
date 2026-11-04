import type { CSSProperties } from 'react';

export function BrandLogo({ size = 44, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`brand-logo ${className}`} style={{ '--logo-size': `${size}px` } as CSSProperties}>
      <img src="/uit-anniversary-logo.jpg" alt="Trường Đại học Công nghệ Thông tin - 20 năm"
        width={size} height={size} decoding="async" />
    </span>
  );
}
