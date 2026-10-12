// ═══════════════════════════════════════════════════════════════
// EmptyState — Displayed when no data is available
// ═══════════════════════════════════════════════════════════════

import type { ReactNode } from 'react';

interface EmptyStateProps {
  title?: string;
  message: string;
  icon?: string;
  action?: ReactNode;
}

export function EmptyState({
  title,
  message,
  icon = '📋',
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
      <div className="text-4xl">{icon}</div>
      {title && (
        <h3 className="mt-3 text-lg font-semibold text-gray-900">{title}</h3>
      )}
      <p className="mt-2 text-sm text-gray-500">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
