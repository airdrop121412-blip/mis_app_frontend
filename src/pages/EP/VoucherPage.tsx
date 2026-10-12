// ═══════════════════════════════════════════════════════════════
// VoucherPage — Voucher management screen
//
// Shows EP summary, EC status, compensation summary, voucher list,
// and Create Voucher action (from approved compensations).
// Route: /ep/:id/voucher
// ═══════════════════════════════════════════════════════════════

import { useParams, Link } from 'react-router';
import { useEp } from '../../hooks/useEp';
import { useEc, useCompensations } from '../../hooks/useEc';
import { useVouchers, useCreateVoucher } from '../../hooks/useVoucher';
import { PageLayout } from '../../components/PageLayout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { StatusBadge } from '../../components/StatusBadge';
import { formatMoney, formatDate } from '../../utils/format';
import { COMPENSATION_LABELS } from '../../types/ec';
import { VOUCHER_STATUS_LABEL, VOUCHER_STATUS_STYLE } from '../../types/voucher';
import type { VoucherStatus } from '../../types/voucher';

export function VoucherPage() {
  const { id } = useParams<{ id: string }>();
  const epId = Number(id);

  // ── Queries ────────────────────────────────────────────────
  const { data: ep, isLoading: epLoading, error: epError } = useEp(epId);
  const { data: ec, isLoading: ecLoading } = useEc(epId);
  const { data: compensations } = useCompensations(epId);
  const { data: vouchers, isLoading: vouchersLoading } = useVouchers(epId);
  
  // The additional-payment wizard is the entry point for adding new data to
  // a PAID EP. It must be available as soon as the EP is PAID — PAID is used
  // here ONLY to unlock the data-entry workflow, never to decide whether an
  // existing voucher is original or additional (that is determined per
  // voucher from persistent payment_cycle data in VoucherDocument).
  const canAddAdditionalPayment = ep?.status === 'PAID';

  // ── Mutations ──────────────────────────────────────────────
  const createMut = useCreateVoucher(epId);
  // ── Loading / Error states ─────────────────────────────────
  if (epLoading) return <LoadingSpinner message="Loading EP..." />;
  if (epError) return <ErrorDisplay message={epError instanceof Error ? epError.message : 'Failed to load EP'} />;
  if (!ep) return <ErrorDisplay message="EP not found." />;
  if (ecLoading) return <LoadingSpinner message="Loading EC..." />;

  const epAlreadyApproved = ep.status === 'PAID';
  const voucherReady = epAlreadyApproved || ec?.status === 'APPROVED';
  const approvedComps = (compensations ?? []).filter((c) => c.status === 'APPROVED');
  const hasUnvouchered = approvedComps.length > 0;

  function handleCreate() {
    if (!confirm('Create a voucher from all approved compensations not yet in any voucher?')) return;
    createMut.mutate();
  }

  return (
    <PageLayout
      title={`Voucher — ${ep.ep_id ?? ep.name}`}
      subtitle={
        <span className="inline-flex items-center gap-2">
          EP: {ep.name} · {ep.ep_id ?? 'DRAFT'} · EC:{' '}
          {ec ? <StatusBadge status={ec.status} /> : '—'}
        </span>
      }
      actions={
        <Link
          to={`/ep/${epId}`}
          className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          ← Back to EP
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Compensation Summary ───────────────────────────── */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">💰 Compensation Summary</h2>

          {!voucherReady ? (
            <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">
              ⚠️ EC must be <strong>APPROVED</strong> before a voucher can be created unless the EP is already marked <strong>PAID</strong>.
              Current EC status: {ec?.status ?? '—'}.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="py-2">Category</th>
                  <th className="py-2 text-right">Assessed</th>
                  <th className="py-2 text-right">Approved</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(compensations ?? []).map((c) => (
                  <tr key={c.compensation_id} className="border-b border-gray-100">
                    <td className="py-2">{COMPENSATION_LABELS[c.category] ?? c.category}</td>
                    <td className="py-2 text-right">{formatMoney(c.assessed_amount)}</td>
                    <td className="py-2 text-right">{formatMoney(c.approved_amount)}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.status === 'APPROVED'
                          ? 'bg-green-100 text-green-700'
                          : c.status === 'PAID'
                            ? 'bg-blue-100 text-blue-700'
                            : c.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {approvedComps.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-sm text-gray-400">
                      No approved compensations yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {voucherReady && hasUnvouchered && (
            <button
              onClick={handleCreate}
              disabled={createMut.isPending}
              className="mt-4 w-full rounded bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createMut.isPending ? 'Creating...' : '🧾 Create Voucher'}
            </button>
          )}
          {createMut.isError && (
            <p className="mt-2 text-sm text-red-600">
              {createMut.error instanceof Error ? createMut.error.message : 'Failed to create voucher'}
            </p>
          )}
{canAddAdditionalPayment && (
             <div className="mt-6 rounded-md border border-blue-200 bg-blue-50 p-4">
               <h3 className="font-semibold text-blue-900">Additional payment</h3>
               <p className="mt-1 text-xs text-blue-800">Previous paid compensation and detail records are locked. Add new detail records and link one new loss category with its amount in the add-only wizard.</p>
               <Link to={`/ep/${epId}/voucher/additional-payment`} className="mt-3 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                 Open additional-payment wizard →
               </Link>
             </div>
           )}
        </div>

        {/* ── Voucher List ───────────────────────────────────── */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">🧾 Voucher List</h2>

          {vouchersLoading ? (
            <LoadingSpinner message="Loading vouchers..." />
          ) : (vouchers ?? []).length === 0 ? (
            <div className="rounded-md bg-gray-50 p-4 text-center text-sm text-gray-500">
              No vouchers created yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="py-2">Voucher #</th>
                  <th className="py-2">Date</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {(vouchers ?? []).map((v) => (
                  <tr key={v.voucher_id} className="border-b border-gray-100">
                    <td className="py-2 font-medium">{v.voucher_number}</td>
                    <td className="py-2">{formatDate(v.voucher_date)}</td>
                    <td className="py-2 text-right">{formatMoney(v.approved_amount)}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${VOUCHER_STATUS_STYLE[v.payment_status as VoucherStatus] ?? 'bg-gray-100 text-gray-700'}`}>
                        {VOUCHER_STATUS_LABEL[v.payment_status as VoucherStatus] ?? v.payment_status}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <Link
                        to={`/ep/${epId}/voucher/${v.voucher_id}`}
                        className="text-blue-600 hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageLayout>
  );
}