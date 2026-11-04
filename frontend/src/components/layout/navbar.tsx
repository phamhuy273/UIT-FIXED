import type { ReactNode } from 'react';
import { Button } from '../ui/button';

export interface NavbarProps {
  title: string;
  onMenuToggle: () => void;
  menuOpen: boolean;
  actions?: ReactNode;
}

export function Navbar({ title, onMenuToggle, menuOpen, actions }: NavbarProps) {
  return <header className="app-navbar">
    <div className="navbar-heading">
      <Button variant="ghost" className="mobile-menu-toggle" aria-label="Mở hoặc đóng menu"
        aria-expanded={menuOpen} aria-controls="app-sidebar" onClick={onMenuToggle}>☰</Button>
      <div><span className="eyebrow">UIT-FIXED / KHÔNG GIAN LÀM VIỆC</span><p className="navbar-title">{title}</p></div>
    </div>
    <div className="navbar-actions">{actions}<span className="brand-avatar" aria-label="Đại học Công nghệ Thông tin">UIT</span></div>
  </header>;
}
