// ═══════════════════════════════════════════════════════════════
// CompensationPanel — Compensation create/approve/cancel
// Phase 4 (EC & Compensation)
//
// Compensation is created from an EC line item (assessed_amount is
// snapshotted by the backend). Creation requires the EC to be APPROVED.
// Lifecycle (backend-enforced): DRAFT → APPROVED → PAID | CANCELLED.
//   - Edit/Delete: DRAFT only
//   - Approve: DRAFT → APPROVED
//   - Cancel: DRAFT or APPROVED → CANCELLED
// paid_amount / remaining_amount are backend-computed — never fabricated here.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  useCompensations,
  useCreateCompensation,
  useUpdateCompensation,
  useDeleteCompensation,
  useApproveCompensation,
  useCancelCompensation,
} from '../../hooks/useEc';
import { useEcLineItems } from '../../hooks/useEc';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorDisplay } from '../ErrorDisplay';
import { formatMoney } from '../../utils/format';
import { COMPENSATION_LABELS, COMPENSATION_CATEGORY_ORDER } from '../../types/ec';
import type { Compensation } from '../../types/ec';

interface Props {
  epId: number;
  /** EC is APPROVED — gates compensation creation. */
  ecApproved: boolean;
}

type Mode = 'closed' | 'create' | 'edit';

const STATUS_STYLE: Record<Compensation['status'], string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  APPROVED: 'bg-green-100 text-green-700',
  PAID: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export function CompensationPanel({ epId, ecApproved }: Props) {
  const { data: compensations, isLoading, error, refetch } = useCompensations(epId);
  const { data: lineItems } = useEcLineItems(epId);
  const createMut = useCreateCompensation(epId);
  const updateMut = useUpdateCompensation(epId);
  const deleteMut = useDeleteCompensation(epId);
  const approveMut = useApproveCompensation(epId);
  const cancelMut = useCancelCompensation(epId);

  const [mode, setMode] = useState<Mode>('closed');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [category, setCategory] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isPending =
    createMut.isPending || updateMut.isPending || deleteMut.isPending ||
    approveMut.isPending || cancelMut.isPending;
  const mutationError = createMut.error || updateMut.error || deleteMut.error ||
    approveMut.error || cancelMut.error;

  function resetForm() {
    setCategory('');
    setApprovedAmount('');
    setRemarks('');
    setFormError(null);
    setEditingId(null);
    setMode('closed');
  }

  function openCreate() {
    setFormError(null);
    setEditingId(null);
    setMode('create');
  }

  function openEdit(c: Compensation) {
    setFormError(null);
    setEditingId(c.compensation_id);
    setCategory(c.category);
    setApprovedAmount(c.approved_amount);
    setRemarks(c.remarks ?? '');
    setMode('edit');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (mode === 'create' && !category) {
      setFormError('Category is required.');
      return;
    }
    if (!approvedAmount || Number(approvedAmount) < 0) {
      setFormError('Approved amount must be a non-negative number.');
      return;
    }

    if (mode === 'edit' && editingId !== null) {
      updateMut.mutate(
        { compensationId: editingId, payload: { approved_amount: approvedAmount, remarks } },
        { onSuccess: resetForm },
      );
    } else {
      createMut.mutate(
        { category, approved_amount: approvedAmount, remarks },
        { onSuccess: resetForm },
      );
    }
  }

  function handleApprove(c: Compensation) {
    if (!confirm(`Approve compensation "${COMPENSATION_LABELS[c.category] ?? c.category}"?`)) return;
    approveMut.mutate(c.compensation_id);
  }

  function handleCancel(c: Compensation) {
    if (!confirm(`Cancel compensation "${COMPENSATION_LABELS[c.category] ?? c.category}"?`)) return;
    cancelMut.mutate(c.compensation_id);
  }

  function handleDelete(c: Compensation) {
    if (!confirm(`Delete compensation "${COMPENSATION_LABELS[c.category] ?? c.category}"?`)) return;
    deleteMut.mutate(c.compensation_id);
  }

  if (isLoading) return <LoadingSpinner message="Loading compensations..." />;
  if (error) return <ErrorDisplay message={String(error)} onRetry={() => refetch()} />;

  // Categories that have a line item but no compensation yet (available to create).
  const existingCategories = new Set((compensations ?? []).map((c) => c.category));
  const availableCategories = (lineItems ?? [])
    .map((li) => li.category)
    .filter((c) => !existingCategories.has(c));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">💰 Compensations</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="text-xs text-blue-600 hover:underline">
            Refresh
          </button>
          {ecApproved && mode === 'closed' && (
            <button
              onClick={openCreate}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              + Create Compensation
            </button>
          )}
        </div>
      </div>

      {!ecApproved && (
        <p className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          EC must be APPROVED to create compensations.
        </p>
      )}

      {mutationError && (
        <ErrorDisplay
          title="Action failed"
          message={mutationError instanceof Error ? mutationError.message : 'An error occurred'}
        />
      )}

      {/* ── Create / Edit form ────────────────────────────── */}
      {mode !== 'closed' && (
        <form onSubmit={handleSubmit} className="mb-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700">
            {mode === 'edit' ? 'Edit Compensation' : 'Create Compensation'}
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Category <span className="text-red-500">*</span>
              </label>
              {mode === 'edit' ? (
                <input
                  type="text"
                  value={COMPENSATION_LABELS[category] ?? category}
                  disabled
                  className="rounded border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm text-gray-500"
                />
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select category...</option>
                  {COMPENSATION_CATEGORY_ORDER
                    .filter((c) => availableCategories.includes(c))
                    .map((c) => (
                      <option key={c} value={c}>
                        {COMPENSATION_LABELS[c] ?? c}
                      </option>
                    ))}
                </select>
              )}
              {mode === 'create' && availableCategories.length === 0 && (
                <p className="text-[11px] text-amber-600">
                  No line items without a compensation remain.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Approved Amount (BDT) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
              <label className="text-xs font-medium text-gray-500">Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          {formError && <p className="mt-2 text-xs text-red-600">{formError}</p>}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Compensation'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={isPending}
              className="rounded border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Compensations table ───────────────────────────── */}
      {!compensations || compensations.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">No compensations recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs uppercase text-gray-500">
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2 text-right">Assessed (BDT)</th>
                <th className="px-3 py-2 text-right">Approved (BDT)</th>
                <th className="px-3 py-2 text-right">Paid (BDT)</th>
                <th className="px-3 py-2 text-right">Remaining (BDT)</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {compensations.map((c) => (
                <tr key={c.compensation_id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{COMPENSATION_LABELS[c.category] ?? c.category}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(c.assessed_amount)}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatMoney(c.approved_amount)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(c.paid_amount ?? '0')}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(c.remaining_amount ?? '0')}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {c.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => openEdit(c)}
                          disabled={isPending}
                          className="text-blue-600 hover:underline disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <span className="mx-1 text-gray-300">|</span>
                        <button
                          onClick={() => handleApprove(c)}
                          disabled={isPending}
                          className="text-green-600 hover:underline disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <span className="mx-1 text-gray-300">|</span>
                        <button
                          onClick={() => handleDelete(c)}
                          disabled={isPending}
                          className="text-red-600 hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {(c.status === 'DRAFT' || c.status === 'APPROVED') && (
                      <>
                        {c.status !== 'DRAFT' && <span className="mx-1 text-gray-300">|</span>}
                        <button
                          onClick={() => handleCancel(c)}
                          disabled={isPending}
                          className="text-red-600 hover:underline disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {(c.status === 'PAID' || c.status === 'CANCELLED') && (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
