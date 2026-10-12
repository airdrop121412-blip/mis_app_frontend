// ═══════════════════════════════════════════════════════
// EpImportPage — Redirects to the step-by-step wizard.
// The bulk upload (all sheets at once) was replaced by the
// table-by-table wizard at /admin/ep-import-wizard.
// ═══════════════════════════════════════════════════════

import { Navigate } from 'react-router';

export function EpImportPage() {
  return <Navigate to="/admin/ep-import-wizard" replace />;
}
