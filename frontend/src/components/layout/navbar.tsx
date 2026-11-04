import type { ReactNode } from 'react';

export interface NavbarProps {
  title: string;
  onMenuToggle: () => void;
  menuOpen: boolean;
  actions?: ReactNode;
}

export function Navbar({ title, onMenuToggle, menuOpen, actions }: NavbarProps) {
  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          className="btn btn--ghost btn--sm mobile-menu-toggle"
          aria-label="Mở hoặc đóng menu"
          aria-expanded={menuOpen}
          onClick={onMenuToggle}
        >
          ☰
        </button>
        <div className="breadcrumb">
          <span>UIT-FIXED</span>
          <span className="sep">/</span>
          <strong>{title}</strong>
        </div>
      </div>
      {actions}
    </header>
  );
}
