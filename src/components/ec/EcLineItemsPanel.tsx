// ═══════════════════════════════════════════════════════════════
// EcLineItemsPanel — EC Line Item CRUD
// Phase 4 (EC & Compensation)
//
// Line items are editable ONLY while the EC is in DRAFT status.
// Category uses the canonical 18-category taxonomy and is selectable on
// create but read-only on edit (backend enforces one line item per category).
// assessed_amount is entered by the user; totals are recalculated by the
// backend (Recalculate endpoint) — the frontend never computes totals.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  useEcLineItems,
  useCreateLineItem,
  useUpdateLineItem,
  useDeleteLineItem,
} from '../../hooks/useEc';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorDisplay } from '../ErrorDisplay';
import { formatMoney } from '../../utils/format';
import { COMPENSATION_LABELS, COMPENSATION_CATEGORY_ORDER } from '../../types/ec';
import type { EcLineItem } from '../../types/ec';

interface Props {
  epId: number;
  /** EC is editable (DRAFT) — gates add/edit/delete. */
  editable: boolean;
}

type Mode = 'closed' | 'create' | 'edit';

export function EcLineItemsPanel({ epId, editable }: Props) {
  const { data: lineItems, isLoading, error, refetch } = useEcLineItems(epId);
  const createMut = useCreateLineItem(epId);
  const updateMut = useUpdateLineItem(epId);
  const deleteMut = useDeleteLineItem(epId);

  const [mode, setMode] = useState<Mode>('closed');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [assessedAmount, setAssessedAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isPending = createMut.isPending || updateMut.isPending || deleteMut.isPending;
  const mutationError = createMut.error || updateMut.error || deleteMut.error;

  function resetForm() {
    setCategory('');
    setDescription('');
    setAssessedAmount('');
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

  function openEdit(item: EcLineItem) {
    setFormError(null);
    setEditingId(item.ec_line_item_id);
    setCategory(item.category);
    setDescription(item.description ?? '');
    setAssessedAmount(item.assessed_amount);
    setRemarks(item.remarks ?? '');
    setMode('edit');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (mode === 'create' && !category) {
      setFormError('Category is required.');
      return;
    }
    if (!assessedAmount || Number(assessedAmount) < 0) {
      setFormError('Assessed amount must be a non-negative number.');
      return;
    }

    if (mode === 'edit' && editingId !== null) {
      updateMut.mutate(
        { lineItemId: editingId, payload: { description, assessed_amount: assessedAmount, remarks } },
        { onSuccess: resetForm },
      );
    } else {
      createMut.mutate(
        { category, description, assessed_amount: assessedAmount, remarks },
        { onSuccess: resetForm },
      );
    }
  }

  function handleDelete(item: EcLineItem) {
    if (!confirm(`Delete line item "${COMPENSATION_LABELS[item.category] ?? item.category}"?`)) return;
    deleteMut.mutate(item.ec_line_item_id);
  }

  if (isLoading) return <LoadingSpinner message="Loading line items..." />;
  if (error) return <ErrorDisplay message={String(error)} onRetry={() => refetch()} />;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">🧾 Line Items</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="text-xs text-blue-600 hover:underline">
            Refresh
          </button>
          {editable && mode === 'closed' && (
            <button
              onClick={openCreate}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              + Add Line Item
            </button>
          )}
        </div>
      </div>

      {!editable && (
        <p className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          EC is not in DRAFT — line items are read-only.
        </p>
      )}

      {mutationError && (
        <ErrorDisplay
          title="Save failed"
          message={mutationError instanceof Error ? mutationError.message : 'An error occurred'}
        />
      )}

      {/* ── Add / Edit form ───────────────────────────────── */}
      {mode !== 'closed' && (
        <form onSubmit={handleSubmit} className="mb-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700">
            {mode === 'edit' ? 'Edit Line Item' : 'Add Line Item'}
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
                  {COMPENSATION_CATEGORY_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {COMPENSATION_LABELS[c] ?? c}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Assessed Amount (BDT) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={assessedAmount}
                onChange={(e) => setAssessedAmount(e.target.value)}
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
              {isPending ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Add Line Item'}
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

      {/* ── Line items table ──────────────────────────────── */}
      {!lineItems || lineItems.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">No line items yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs uppercase text-gray-500">
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2 text-right">Assessed (BDT)</th>
                {editable && <th className="px-3 py-2 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lineItems.map((li) => (
                <tr key={li.ec_line_item_id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{COMPENSATION_LABELS[li.category] ?? li.category}</td>
                  <td className="px-3 py-2">{li.description ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatMoney(li.assessed_amount)}</td>
                  {editable && (
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button
                        onClick={() => openEdit(li)}
                        disabled={isPending}
                        className="text-blue-600 hover:underline disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <span className="mx-1 text-gray-300">|</span>
                      <button
                        onClick={() => handleDelete(li)}
                        disabled={isPending}
                        className="text-red-600 hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
