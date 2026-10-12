// ═══════════════════════════════════════════════════════════════
// ECPage — Entitled Compensation management screen
//
// Shows EC status, line items, compensations, and lifecycle actions:
//   Create → Submit → Verify → Approve / Reject
// Plus: Recalculate totals, Print EC document
// Route: /ep/:id/ec
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useEp } from '../../hooks/useEp';
import {
  useEc,
  useCreateEc,
  useSubmitEc,
  useVerifyEc,
  useApproveEc,
  useRejectEc,
  useRecalculateEc,
} from '../../hooks/useEc';
import { EcLineItemsPanel } from '../../components/ec/EcLineItemsPanel';
import { CompensationPanel } from '../../components/ec/CompensationPanel';
import { PageLayout } from '../../components/PageLayout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { StatusBadge } from '../../components/StatusBadge';
import { formatMoney, formatTimestamp } from '../../utils/format';
import type { EcStatus } from '../../types/ec';

// ── Status display config ─────────────────────────────────────
const STATUS_STYLE: Record<EcStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  VERIFIED: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export function EcPage() {
  const { id } = useParams<{ id: string }>();
  const epId = Number(id);
  const [rejectReason, setRejectReason] = useState('');

  // ── Queries ────────────────────────────────────────────────
  const { data: ep, isLoading: epLoading, error: epError } = useEp(epId);
  const { data: ec, isLoading: ecLoading } = useEc(epId);

  // ── Mutations ──────────────────────────────────────────────
  const createMut = useCreateEc(epId);
  const submitMut = useSubmitEc(epId);
  const verifyMut = useVerifyEc(epId);
  const approveMut = useApproveEc(epId);
  const rejectMut = useRejectEc(epId);
  const recalcMut = useRecalculateEc(epId);

  // ── Handlers ───────────────────────────────────────────────
  function handleCreate() {
    if (!confirm('Create EC for this EP?')) return;
    createMut.mutate();
  }

  function handleTransition(action: 'submit' | 'verify' | 'approve') {
    const label = action.toUpperCase();
    if (!confirm(`Are you sure you want to ${label} this EC?`)) return;
    const fn = action === 'submit' ? submitMut : action === 'verify' ? verifyMut : approveMut;
    fn.mutate();
  }

  function handleReject() {
    if (!rejectReason.trim()) {
      alert('A rejection reason is required.');
      return;
    }
    if (!confirm('Reject this EC? It will return to editable state.')) return;
    rejectMut.mutate(rejectReason.trim(), { onSuccess: () => setRejectReason('') });
  }

  function handleRecalculate() {
    if (!confirm('Recalculate totals from line items?')) return;
    recalcMut.mutate();
  }

  // ── Loading / Error states ─────────────────────────────────
  if (epLoading) return <LoadingSpinner message="Loading EP..." />;
  if (epError) return <ErrorDisplay message={epError instanceof Error ? epError.message : 'Failed to load EP'} />;
  if (!ep) return <ErrorDisplay message="EP not found." />;
  if (ecLoading) return <LoadingSpinner message="Loading EC..." />;

  const hasEc = !!ec;
  const status = ec?.status as EcStatus | undefined;

  return (
    <PageLayout
      title={`EC — ${ep.ep_id ?? ep.name}`}
      subtitle={
        <span className="inline-flex items-center gap-2">
          EP: {ep.name} · {ep.ep_id ?? 'DRAFT'}
          {' · '}
          <StatusBadge status={ep.status} />
          {hasEc && (
            <>
              {' · EC: '}
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status ?? 'DRAFT']}`}>
                {status}
              </span>
            </>
          )}
        </span>
      }
      actions={
        <div className="flex items-center gap-2">
          {hasEc && (
            <Link
              to={`/ep/${epId}/ec/print`}
              className="rounded bg-gray-100 border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              🖨️ Print EC
            </Link>
          )}
          <Link
            to={`/ep/${epId}`}
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            ← Back to EP
          </Link>
        </div>
      }
    >
      {!hasEc ? (
        /* ── No EC yet ─────────────────────────────────────── */
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 rounded-md bg-amber-50 p-4 text-sm text-amber-800">
            ⚠️ No EC has been created for this EP yet. Create EC directly; EPICAD is handled automatically.
          </div>
          <button
            onClick={handleCreate}
            disabled={createMut.isPending}
            className="rounded bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createMut.isPending ? 'Creating...' : '📋 Create EC'}
          </button>
          {createMut.isError && (
            <p className="mt-3 text-sm text-red-600">
              {createMut.error instanceof Error ? createMut.error.message : 'Failed to create EC'}
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── EC Summary ──────────────────────────────────── */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">📄 EC Summary</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <InfoItem label="EC Number" value={ec.ec_number} />
              <InfoItem label="Assessment Date" value={ec.assessment_date} />
              <InfoItem label="Total Assessed Loss" value={formatMoney(ec.total_assessed_loss)} />
              <InfoItem label="Total Compensation" value={formatMoney(ec.total_compensation)} />
              <InfoItem label="Remarks" value={ec.remarks} />
              <InfoItem label="Created" value={formatTimestamp(ec.created_at)} />
            </dl>

            {/* Status actions */}
            <div className="mt-6 space-y-2">
              {status === 'DRAFT' && (
                <button
                  onClick={() => handleTransition('submit')}
                  disabled={submitMut.isPending}
                  className="w-full rounded bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {submitMut.isPending ? 'Submitting...' : '📤 Submit for Verification'}
                </button>
              )}
              {status === 'SUBMITTED' && (
                <button
                  onClick={() => handleTransition('verify')}
                  disabled={verifyMut.isPending}
                  className="w-full rounded bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {verifyMut.isPending ? 'Verifying...' : '✅ Verify'}
                </button>
              )}
              {status === 'VERIFIED' && (
                <button
                  onClick={() => handleTransition('approve')}
                  disabled={approveMut.isPending}
                  className="w-full rounded bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {approveMut.isPending ? 'Approving...' : '👍 Approve'}
                </button>
              )}
              {(status === 'DRAFT' || status === 'SUBMITTED' || status === 'VERIFIED') && (
                <div className="rounded-md border border-gray-200 p-3">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Reject reason (required)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection"
                      className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                    <button
                      onClick={handleReject}
                      disabled={rejectMut.isPending}
                      className="rounded border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
              {status === 'DRAFT' && (
                <button
                  onClick={handleRecalculate}
                  disabled={recalcMut.isPending}
                  className="w-full rounded border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {recalcMut.isPending ? 'Recalculating...' : '🧮 Recalculate Totals'}
                </button>
              )}
              {rejectMut.isError && (
                <p className="text-sm text-red-600">
                  {rejectMut.error instanceof Error ? rejectMut.error.message : 'Failed to reject'}
                </p>
              )}
            </div>
          </div>

          {/* ── Line Items ──────────────────────────────────── */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <EcLineItemsPanel epId={epId} editable={status === 'DRAFT'} />
          </div>

          {/* ── Compensations ───────────────────────────────── */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
            <CompensationPanel epId={epId} ecApproved={status === 'APPROVED'} />
          </div>
        </div>
      )}
    </PageLayout>
  );
}

// ── Helper component ─────────────────────────────────────────
function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <dt className="font-medium text-gray-600">{label}</dt>
      <dd className="text-gray-900">{value || '—'}</dd>
    </>
  );
}