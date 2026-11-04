import type { ReactNode } from 'react';
import { Button } from '../ui/button';
import { BrandLogo } from '../ui/brand-logo';

export interface NavigationItem { id: string; label: string; icon?: ReactNode; }
export interface SidebarProps {
  items: NavigationItem[];
  activeItem: string;
  onNavigate: (id: string) => void;
  onClose: () => void;
  mobileOpen: boolean;
}

export function Sidebar({ items, activeItem, onNavigate, onClose, mobileOpen }: SidebarProps) {
  return <aside id="app-sidebar" className={`app-sidebar ${mobileOpen ? 'is-open' : ''}`}>
    <a className="brand" href="#main-content" onClick={onClose}>
      <BrandLogo />
      <span>UIT-FIXED<small>CAMPUS CARE</small></span>
    </a>
    <Button variant="ghost" size="sm" className="sidebar-close" onClick={onClose} aria-label="Đóng menu">✕</Button>
    <p className="sidebar-section-label">KHÔNG GIAN CHUNG</p>
    <nav aria-label="Điều hướng chính">{items.map((item) => (
      <button key={item.id} type="button" className={`nav-item ${activeItem === item.id ? 'is-active' : ''}`}
        aria-current={activeItem === item.id ? 'page' : undefined}
        onClick={() => { onNavigate(item.id); onClose(); }}>
        <span aria-hidden="true">{item.icon ?? '◇'}</span>{item.label}
      </button>
    ))}</nav>
    <div className="sidebar-note"><span aria-hidden="true">✦</span><strong>Một khuôn viên tốt hơn</strong><p>Kết nối để chăm sóc không gian học tập của chúng ta.</p></div>
    <footer className="sidebar-footer"><span className="campus-dot" />ĐH Công nghệ Thông tin<small>AURA FAMI · UIT-FIXED</small></footer>
  </aside>;
}
