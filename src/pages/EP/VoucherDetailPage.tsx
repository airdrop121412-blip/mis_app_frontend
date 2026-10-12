// ═══════════════════════════════════════════════════════════════
// VoucherDetailPage — Voucher detail + payment management
//
// Shows voucher header, attached compensations, payment history,
// payment summary, and lifecycle actions:
//   Verify → Approve → Cancel, Record Payment, Print Voucher
// Route: /ep/:id/voucher/:vid
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useEp } from '../../hooks/useEp';
import {
  useVoucher,
  usePayments,
  useVerifyVoucher,
  useApproveVoucher,
  useCancelVoucher,
  useRecordPayment,
  useVoidPayment,
  usePaymentMethods,
  paymentSummary,
} from '../../hooks/useVoucher';
import { PageLayout } from '../../components/PageLayout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { formatMoney, formatDate } from '../../utils/format';
import { COMPENSATION_LABELS } from '../../types/ec';
import { VOUCHER_STATUS_LABEL, VOUCHER_STATUS_STYLE } from '../../types/voucher';
import type { VoucherStatus } from '../../types/voucher';

export function VoucherDetailPage() {
  const { id, vid } = useParams<{ id: string; vid: string }>();
  const epId = Number(id);
  const voucherId = Number(vid);

  // ── Payment form state ─────────────────────────────────────
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payMethod, setPayMethod] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payRef, setPayRef] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));

  // ── Approve form state ──────────────────────────────────────
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [approveDate, setApproveDate] = useState(new Date().toISOString().slice(0, 10));

  // ── Queries ────────────────────────────────────────────────

  // ── Queries ────────────────────────────────────────────────
  const { data: ep, isLoading: epLoading, error: epError } = useEp(epId);
  const { data: voucher, isLoading: voucherLoading } = useVoucher(epId, voucherId);
  const { data: payments, isLoading: paymentsLoading } = usePayments(epId, voucherId);
  const { data: payMethods } = usePaymentMethods();

  // ── Mutations ──────────────────────────────────────────────
  const verifyMut = useVerifyVoucher(epId, voucherId);
  const approveMut = useApproveVoucher(epId, voucherId);
  const cancelMut = useCancelVoucher(epId, voucherId);
  const recordMut = useRecordPayment(epId, voucherId);
  const voidMut = useVoidPayment(epId, voucherId);

  // ── Loading / Error states ─────────────────────────────────
  if (epLoading) return <LoadingSpinner message="Loading EP..." />;
  if (epError) return <ErrorDisplay message={epError instanceof Error ? epError.message : 'Failed to load EP'} />;
  if (!ep) return <ErrorDisplay message="EP not found." />;
  if (voucherLoading) return <LoadingSpinner message="Loading voucher..." />;
  if (!voucher) return <ErrorDisplay message="Voucher not found." />;

  const status = voucher.payment_status as VoucherStatus;
  const isPending = status === 'PENDING';
  const isCancelled = status === 'CANCELLED';
  const summary = paymentSummary(voucher, payments);
  const canRecordPayment = !isCancelled && summary.remaining > 0;

  // ── Handlers ───────────────────────────────────────────────
  function handleVerify() {
    if (!confirm('Verify this voucher?')) return;
    verifyMut.mutate();
  }

  function handleApprove() {
    setShowApproveForm(true);
  }

  function handleApproveConfirm() {
    setShowApproveForm(false);
    approveMut.mutate(approveDate);
  }

  function handleCancel() {
    if (!confirm('Cancel this voucher? Only possible if no payments recorded.')) return;
    cancelMut.mutate();
  }

  function handleRecordPayment() {
    const methodId = Number(payMethod);
    const amount = parseFloat(payAmount);
    if (!methodId) { alert('Select a payment method.'); return; }
    if (!amount || amount <= 0) { alert('Enter a valid amount.'); return; }
    if (amount > summary.remaining) {
      alert(`Amount exceeds remaining balance (${formatMoney(summary.remaining)}).`);
      return;
    }
    if (!payDate) { alert('Select a payment date.'); return; }

    recordMut.mutate(
      {
        payment_method_id: methodId,
        amount,
        payment_reference: payRef || undefined,
        payment_date: payDate,
      },
      {
        onSuccess: () => {
          setShowPaymentForm(false);
          setPayMethod('');
          setPayAmount('');
          setPayRef('');
        },
      }
    );
  }

  function handleVoid(paymentId: number) {
    if (!confirm('Void this payment? The voucher status will be recalculated.')) return;
    voidMut.mutate(paymentId);
  }

  return (
    <PageLayout
      title={`Voucher ${voucher.voucher_number}`}
      subtitle={
        <span className="inline-flex items-center gap-2">
          EP: {ep.name} · {ep.ep_id ?? 'DRAFT'} ·{' '}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${VOUCHER_STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-700'}`}>
            {VOUCHER_STATUS_LABEL[status] ?? status}
          </span>
        </span>
      }
      actions={
        <div className="flex items-center gap-2">
          <Link
            to={`/ep/${epId}/voucher/${voucherId}/print`}
            className="rounded bg-gray-100 border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            🖨️ Print Voucher
          </Link>
          <Link
            to={`/ep/${epId}/voucher`}
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </Link>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Voucher Header + Compensations ─────────────────── */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">🧾 Voucher Details</h2>
          <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <InfoItem label="Voucher #" value={voucher.voucher_number} />
            <InfoItem label="Date" value={formatDate(voucher.voucher_date)} />
            <InfoItem label="Approved Amount" value={formatMoney(voucher.approved_amount)} />
            <InfoItem label="Status" value={VOUCHER_STATUS_LABEL[status] ?? status} />
            <InfoItem label="Prepared By" value={voucher.prepared_by ? `User #${voucher.prepared_by}` : '—'} />
            <InfoItem label="Verified By" value={voucher.verified_by ? `User #${voucher.verified_by}` : '—'} />
            <InfoItem label="Approved By" value={voucher.approved_by ? `User #${voucher.approved_by}` : '—'} />
            <InfoItem label="Remarks" value={voucher.remarks} />
          </dl>

          <h3 className="mb-2 text-sm font-semibold text-gray-700">Attached Compensations</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2">Category</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(voucher.voucher_compensations ?? []).map((vc) => (
                <tr key={vc.voucher_compensation_id} className="border-b border-gray-100">
                  <td className="py-2">
                    {COMPENSATION_LABELS[vc.compensation?.category ?? 'OTHER'] ?? vc.compensation?.category ?? '—'}
                  </td>
                  <td className="py-2 text-right">{formatMoney(vc.amount)}</td>
                </tr>
              ))}
              {(voucher.voucher_compensations ?? []).length === 0 && (
                <tr>
                  <td colSpan={2} className="py-4 text-center text-sm text-gray-400">
                    No compensations attached.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ── Lifecycle actions ────────────────────────────── */}
          <div className="mt-4 space-y-2">
            {isPending && (
              <>
                <button
                  onClick={handleVerify}
                  disabled={verifyMut.isPending}
                  className="w-full rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {verifyMut.isPending ? 'Verifying...' : '✅ Verify Voucher'}
                </button>
              {isPending && !isCancelled && (
                <>
                  {showApproveForm ? (
                    <div className="mt-2 rounded bg-green-50 p-4 space-y-3">
                      <p className="text-xs text-green-800">Set the payment date for the auto-recorded disbursement:</p>
                      <input
                        type="date"
                        value={approveDate}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(event) => setApproveDate(event.target.value)}
                        className="w-full rounded border border-green-300 px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setShowApproveForm(false)}
                          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleApproveConfirm}
                          disabled={approveMut.isPending}
                          className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {approveMut.isPending ? 'Approving...' : '👍 Approve Voucher'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleApprove}
                      disabled={approveMut.isPending}
                      className="w-full rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {approveMut.isPending ? 'Approving...' : '👍 Approve Voucher'}
                    </button>
                  )}
                </>
              )}
                <button
                  onClick={handleCancel}
                  disabled={cancelMut.isPending}
                  className="w-full rounded border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {cancelMut.isPending ? 'Cancelling...' : '🗑️ Cancel Voucher'}
                </button>
              </>
            )}
            {isCancelled && (
              <div className="rounded-md bg-red-50 p-3 text-center text-sm text-red-700">
                This voucher has been cancelled.
              </div>
            )}
            {(verifyMut.isError || approveMut.isError || cancelMut.isError) && (
              <p className="text-sm text-red-600">
                {verifyMut.error instanceof Error ? verifyMut.error.message
                  : approveMut.error instanceof Error ? approveMut.error.message
                    : cancelMut.error instanceof Error ? cancelMut.error.message
                      : 'Action failed'}
              </p>
            )}
          </div>
        </div>

        {/* ── Payment History ────────────────────────────────── */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">💳 Payments</h2>

          {/* Payment summary */}
          <div className="mb-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Approved</div>
              <div className="text-sm font-semibold">{formatMoney(summary.approved)}</div>
            </div>
            <div className="rounded-md bg-green-50 p-3">
              <div className="text-xs text-gray-500">Paid</div>
              <div className="text-sm font-semibold text-green-700">{formatMoney(summary.paid)}</div>
            </div>
            <div className="rounded-md bg-amber-50 p-3">
              <div className="text-xs text-gray-500">Remaining</div>
              <div className="text-sm font-semibold text-amber-700">{formatMoney(summary.remaining)}</div>
            </div>
          </div>

          {paymentsLoading ? (
            <LoadingSpinner message="Loading payments..." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="py-2">Date</th>
                  <th className="py-2">Method</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2">Reference</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {(payments ?? []).map((p) => (
                  <tr key={p.payment_id} className="border-b border-gray-100">
                    <td className="py-2">{formatDate(p.payment_date)}</td>
                    <td className="py-2">{p.payment_method?.name ?? `#${p.payment_method_id}`}</td>
                    <td className="py-2 text-right">{formatMoney(p.amount)}</td>
                    <td className="py-2">{p.payment_reference ?? '—'}</td>
                    <td className="py-2 text-right">
                      {!isCancelled && (
                        <button
                          onClick={() => handleVoid(p.payment_id)}
                          disabled={voidMut.isPending}
                          className="text-xs text-red-600 hover:underline disabled:opacity-50"
                        >
                          Void
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(payments ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-sm text-gray-400">
                      No payments recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* ── Record payment form ──────────────────────────── */}
          {canRecordPayment && !showPaymentForm && (
            <button
              onClick={() => setShowPaymentForm(true)}
              className="mt-4 w-full rounded bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              💳 Record Payment
            </button>
          )}

          {showPaymentForm && (
            <div className="mt-4 space-y-3 rounded-md border border-gray-200 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    {(payMethods ?? []).map((m) => (
                      <option key={m.payment_method_id} value={m.payment_method_id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={summary.remaining}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder={`Max ${summary.remaining}`}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Reference</label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="Cheque #, transfer ref..."
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Payment Date</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRecordPayment}
                  disabled={recordMut.isPending}
                  className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {recordMut.isPending ? 'Recording...' : 'Save Payment'}
                </button>
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
              {recordMut.isError && (
                <p className="text-sm text-red-600">
                  {recordMut.error instanceof Error ? recordMut.error.message : 'Failed to record payment'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
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