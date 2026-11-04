import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Navbar } from './navbar';
import { Sidebar, type NavigationItem } from './sidebar';

export interface MainLayoutProps {
  children: ReactNode;
  title: string;
  items: NavigationItem[];
  activeItem: string;
  onNavigate: (id: string) => void;
  actions?: ReactNode;
}

export function MainLayout({ children, title, items, activeItem, onNavigate, actions }: MainLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const sidebar = document.getElementById('app-sidebar');
    // Wait for the mobile sidebar's visibility style to apply before focusing.
    const focusFrame = requestAnimationFrame(() => sidebar?.querySelector<HTMLElement>('a, button')?.focus());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { setMenuOpen(false); return; }
      if (event.key !== 'Tab') return;
      const elements = sidebar?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!elements?.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!sidebar?.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    function onResize() { if (window.matchMedia('(min-width: 1024px)').matches) setMenuOpen(false); }
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      previousFocus?.focus();
    };
  }, [menuOpen]);

  return <div className="app-shell" ref={shellRef}>
    <a href="#main-content" className="skip-link">Đến nội dung chính</a>
    <Sidebar items={items} activeItem={activeItem} onNavigate={onNavigate} mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    {menuOpen && <button className="sidebar-backdrop" onClick={() => setMenuOpen(false)} aria-label="Đóng menu" tabIndex={-1} />}
    <div className="app-workspace" inert={menuOpen || undefined}>
      <Navbar title={title} menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((open) => !open)} actions={actions} />
      <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
      <footer className="workspace-footer">UIT-FIXED <span>Chăm sóc cơ sở vật chất, cùng nhau.</span></footer>
    </div>
  </div>;
}
