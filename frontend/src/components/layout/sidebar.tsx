import type { ReactNode } from 'react';
import { BrandLogo } from '../ui/brand-logo';

export interface NavigationItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

export interface SidebarProps {
  items: NavigationItem[];
  activeItem: string;
  onNavigate: (id: string) => void;
  onClose: () => void;
  mobileOpen: boolean;
  userRole?: string;
  userName?: string;
}

export function Sidebar({ items, activeItem, onNavigate, onClose, mobileOpen, userName, userRole }: SidebarProps) {
  return (
    <aside id="app-sidebar" className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
      <div className="sidebar__brand">
        <BrandLogo size={32} />
        <span>UIT-FIXED</span>
        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label="Đóng menu"
        >
          ✕
        </button>
      </div>

      <div className="sidebar__group">Menu</div>

      <nav className="sidebar__nav" aria-label="Điều hướng chính">
        {items.map((item) => {
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item${isActive ? ' nav-item--active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                onNavigate(item.id);
                onClose();
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar__footer">
        {userName ? (
          <div className="sidebar__user">
            <div className="avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar__user-text">
              <div className="sidebar__user-name">{userName}</div>
              <div className="sidebar__user-role">{userRole ?? 'Người dùng'}</div>
            </div>
          </div>
        ) : null}
        <div className="sidebar__org">ĐH Công nghệ Thông tin · AURA FAMI</div>
      </div>
    </aside>
  );
}
