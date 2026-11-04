import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/ui/brand-logo';
import campus from '../assets/campus.jpg';
import '../gate.css';

interface GateShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  intro?: string;
}

export function GateShell({
  children,
  title = 'Đăng nhập vào tài khoản của bạn',
  subtitle,
  intro = 'Hệ thống tiếp nhận & xử lý sự cố cơ sở vật chất UIT',
}: GateShellProps) {
  return (
    <main className="gate">
      {/* Full-bleed bright background photo */}
      <div className="gate-backdrop" aria-hidden="true">
        <img
          className="gate-bg-photo"
          src={campus}
          alt="Khuôn viên trường Đại học Công nghệ Thông tin"
        />
        <div className="gate-bg-overlay" />
      </div>

      {/* Floating Centered Glassmorphic Card */}
      <div className="gate-center">
        <div className="gate-glass-card">
          <header className="gate-card-header">
            <div className="gate-card-logo">
              <BrandLogo size={64} />
            </div>
            {intro && <p className="gate-system-intro">{intro}</p>}
            <h1 className="gate-card-title">{title}</h1>
            {subtitle && <p className="gate-card-subtitle">{subtitle}</p>}
          </header>

          {children}
        </div>
      </div>
    </main>
  );
}
