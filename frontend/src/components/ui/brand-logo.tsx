export function BrandLogo({ size = 44, className = '' }: { size?: number; className?: string }) {
  return <img src="/uit-anniversary-logo.jpg" alt="Trường Đại học Công nghệ Thông tin - 20 năm"
    width={size} height={size} className={`brand-logo ${className}`} decoding="async" />;
}
