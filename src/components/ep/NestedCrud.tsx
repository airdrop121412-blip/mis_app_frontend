// ═══════════════════════════════════════════════════════════════
// NestedCrud — Generic add/edit/delete list for EP nested entities
// Phase G (Entry EP + Assessment)
//
// The caller binds the API functions to the EP id and provides the
// TanStack query key + an onMutated callback (to invalidate EP-scoped
// queries like validation / file-data). All validation lives on the
// backend — this component only renders server errors.
// ═══════════════════════════════════════════════════════════════

import { useState, Fragment, type ReactNode, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorDisplay } from '../ErrorDisplay';

export interface CrudField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea' | 'date' | 'multiselect';
  options?: { value: number | string; label: string }[];
  required?: boolean;
  step?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  help?: string;
  /** Hide this field unless the predicate returns true for the current form values. */
  visible?: (form: Record<string, unknown>) => boolean;
}

export interface CrudColumn<T> {
  header: string;
  render: (item: T) => ReactNode;
}

type FormValue = string | number | boolean | (string | number)[];

interface NestedCrudProps<T> {
  title: string;
  epId: number;
  isDraft: boolean;
  queryKey: unknown[];
  listFn: () => Promise<{ items: T[]; pagination: Record<string, number> }>;
  createFn: (data: Record<string, unknown>) => Promise<T>;
  updateFn: (id: number, data: Record<string, unknown>) => Promise<T>;
  deleteFn: (id: number) => Promise<void>;
  onMutated: () => void;
  columns: CrudColumn<any>[];
  fields: CrudField[];
  idKey: string;
  emptyMessage: string;
  /** Optional content rendered below each row (e.g. assessment panel / crops). */
  rowExtra?: (item: T) => ReactNode;
}

export function NestedCrud<T>({
  title,
  isDraft,
  queryKey,
  listFn,
  createFn,
  updateFn,
  deleteFn,
  onMutated,
  columns,
  fields,
  idKey,
  emptyMessage,
  rowExtra,
}: NestedCrudProps<T>) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'closed' | 'edit'>('closed');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, FormValue>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: listFn,
  });

  const create = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      onMutated();
      setMode('closed');
      setForm({});
      setErrors({});
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => updateFn(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      onMutated();
      setMode('closed');
      setEditingId(null);
      setForm({});
      setErrors({});
    },
  });

  const remove = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      onMutated();
    },
  });

  const isPending = create.isPending || update.isPending || remove.isPending;
  const mutationError = create.error || update.error || remove.error;

  function openEdit(item: T) {
    const rec = item as Record<string, unknown>;
    const initial: Record<string, FormValue> = {};
    for (const f of fields) {
      const raw = rec[f.name];
      if (f.type === 'checkbox') {
        initial[f.name] = Boolean(raw);
      } else if (f.type === 'multiselect') {
        initial[f.name] = Array.isArray(raw) ? raw.map((v) => Number(v)) : [];
      } else if (f.type === 'number') {
        initial[f.name] = raw === null || raw === undefined ? '' : Number(raw);
      } else {
        initial[f.name] = raw === null || raw === undefined ? '' : String(raw);
      }
    }
    setForm(initial);
    setErrors({});
    setEditingId(Number(rec[idKey]));
    setMode('edit');
  }

  function setField(name: string, value: FormValue) {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});

    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const value = form[f.name];
      if (f.type === 'checkbox') {
        payload[f.name] = Boolean(value);
      } else if (f.type === 'multiselect') {
        payload[f.name] = Array.isArray(value) ? value.map((v) => Number(v)) : [];
      } else if (f.type === 'number') {
        payload[f.name] = value === '' || value === null ? null : Number(value);
      } else {
        payload[f.name] = value === '' ? null : String(value);
      }
    }

    if (mode === 'edit' && editingId !== null) {
      update.mutate({ id: editingId, data: payload });
    } else {
      create.mutate(payload);
    }
  }

  function handleDelete(item: T) {
    const rec = item as Record<string, unknown>;
    const label = String(rec.name ?? rec[idKey] ?? 'record');
    if (window.confirm(`Delete "${label}"? This cannot be undone.`)) {
      remove.mutate(Number(rec[idKey]));
    }
  }

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
<div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="text-xs text-blue-600 hover:underline">
            Refresh
          </button>
        </div>
      </div>

      {!isDraft && (
        <p className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          This EP is {`${'not DRAFT'}`} — nested records are read-only. Submit a correction to edit.
        </p>
      )}

      {mutationError && (
        <ErrorDisplay
          title="Save failed"
          message={(mutationError as { message?: string } | Error).message ?? 'An error occurred'}
        />
      )}

      {/* ── Add / Edit form ───────────────────────────────── */}
      {mode !== 'closed' && (
        <form onSubmit={handleSubmit} className="mb-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700">
            {mode === 'edit' ? `Edit ${title}` : `Add ${title}`}
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fields.filter((f) => !f.visible || f.visible(form)).map((f) => (
              <div key={f.name} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">
                  {f.label}
                  {f.required && <span className="ml-0.5 text-red-500">*</span>}
                </label>
                {f.type === 'select' ? (
                  <select
                    value={String(form[f.name] ?? '')}
                    onChange={(e) => setField(f.name, e.target.value === '' ? '' : Number(e.target.value))}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select...</option>
                    {f.options?.map((o) => (
                      <option key={String(o.value)} value={String(o.value)}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={Boolean(form[f.name])}
                      onChange={(e) => setField(f.name, e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                ) : f.type === 'multiselect' ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded border border-gray-300 bg-white px-3 py-2">
                    {(f.options?.length ?? 0) === 0 && (
                      <span className="text-xs text-gray-400">No options available</span>
                    )}
                    {f.options?.map((o) => {
                      const selected = Array.isArray(form[f.name]) ? (form[f.name] as (string | number)[]) : [];
                      const checked = selected.map(String).includes(String(o.value));
                      return (
                        <label key={String(o.value)} className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = checked
                                ? selected.filter((v) => String(v) !== String(o.value))
                                : [...selected, o.value];
                              setField(f.name, next);
                            }}
                            className="rounded"
                          />
                          {o.label}
                        </label>
                      );
                    })}
                  </div>
                ) : f.type === 'textarea' ? (
                  <textarea
                    value={String(form[f.name] ?? '')}
                    onChange={(e) => setField(f.name, e.target.value)}
                    rows={2}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                ) : (
                  <input
                    type={f.type}
                    value={String(form[f.name] ?? '')}
                    onChange={(e) => setField(f.name, e.target.value)}
                    step={f.step}
                    min={f.min}
                    max={f.max}
                    placeholder={f.placeholder}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                )}
                {f.help && <p className="text-[11px] text-gray-400">{f.help}</p>}
                {errors[f.name]?.[0] && <p className="text-xs text-red-600">{errors[f.name]?.[0]}</p>}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : mode === 'edit' ? 'Update' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('closed'); setEditingId(null); setForm({}); setErrors({}); }}
              className="rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── List ──────────────────────────────────────────── */}
      {isLoading && <LoadingSpinner message={`Loading ${title.toLowerCase()}...`} />}
      {error && <ErrorDisplay message={String(error)} onRetry={() => refetch()} />}
      {data && data.items.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-400">{emptyMessage}</p>
      )}
      {data && data.items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">#</th>
                {columns.map((col, i) => (
                  <th key={i} className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">{col.header}</th>
                ))}
                {isDraft && <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((item, idx) => (
                <Fragment key={String((item as Record<string, unknown>)[idKey]) ?? idx}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-500">{idx + 1}</td>
                    {columns.map((col, i) => (
                      <td key={i} className="px-3 py-2 text-sm text-gray-700">{col.render(item)}</td>
                    ))}
                    {isDraft && (
                      <td className="whitespace-nowrap px-3 py-2 text-right text-sm">
                        <button
                          onClick={() => openEdit(item)}
                          disabled={isPending}
                          className="text-blue-600 hover:underline disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <span className="mx-1 text-gray-300">|</span>
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={isPending}
                          className="text-red-600 hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                  {rowExtra && (
                    <tr className="bg-gray-50/50">
                      <td colSpan={columns.length + 2} className="px-3 py-2">
                        {rowExtra(item)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}