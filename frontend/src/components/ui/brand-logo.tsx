import type { CSSProperties } from 'react';

export function BrandLogo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`brand-logo ${className}`.trim()} style={{ '--logo-size': `${size}px` } as CSSProperties}>
      <img
        src="/uit-logo-badge.png"
        alt="Trường Đại học Công nghệ Thông tin - ĐHQG-HCM"
        width={size}
        height={size}
        decoding="async"
      />
    </span>
  );
}
