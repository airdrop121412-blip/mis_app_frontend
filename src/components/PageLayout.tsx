// ═══════════════════════════════════════════════════════════════
// PageLayout — Reusable page wrapper with title, actions, content
// Design system: topbar (title + actions) + rule + content.
// ═══════════════════════════════════════════════════════════════

import type { ReactNode } from 'react';

interface PageLayoutProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageLayout({ title, subtitle, actions, children, className = '' }: PageLayoutProps) {
  return (
    <div className={className}>
      <div className="topbar">
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="top-actions">{actions}</div>}
      </div>

      <div className="rule" />

      <div className="space-y-6 pb-4">{children}</div>
    </div>
  );
}