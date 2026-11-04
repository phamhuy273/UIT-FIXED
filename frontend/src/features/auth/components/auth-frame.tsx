import type { ReactNode } from 'react';
import { TicketMark } from './ticket-mark';
import '../auth.css';

export function AuthFrame({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="auth-screen">
      <div className="auth-layout">
        <header className="auth-intro">
          <p className="auth-mark">
            <TicketMark />
            UIT-FIXED
          </p>
          <h1>{title}</h1>
          {aside}
        </header>
        <section className="auth-panel">{children}</section>
      </div>
    </main>
  );
}
