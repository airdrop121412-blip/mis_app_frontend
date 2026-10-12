// ═══════════════════════════════════════════════════════════════
// StatusBadge — Colored status pill for workflow states
// Uses the MIS design-system badge palette (draft/pending/approved/rejected).
// ═══════════════════════════════════════════════════════════════

const DESIGN_STATUS: Record<string, string> = {
  DRAFT: 'draft',
  SUBMITTED: 'pending',
  VERIFIED: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PENDING: 'pending',
  PARTIAL: 'pending',
  PAID: 'approved',
  'PAID & ADDITIONAL': 'approved',
  CANCELLED: 'rejected',
  NOT_PRINTED: 'draft',
  PRINTED: 'approved',
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`badge ${DESIGN_STATUS[status] ?? 'draft'}`}>{status}</span>;
}