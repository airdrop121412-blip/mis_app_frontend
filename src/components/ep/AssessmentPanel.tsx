// ═══════════════════════════════════════════════════════════════
// AssessmentPanel — 1:1 assessment editor for a nested entity
// Phase G (Entry EP + Assessment)
//
// Each Land / Tree / Infrastructure / Crop / Worker / Business has at
// most ONE assessment. The backend computes assessed_loss from the rate
// snapshot — this component only sends the inputs and renders the result.
// ═══════════════════════════════════════════════════════════════

import { useState, type ReactNode, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorDisplay } from '../ErrorDisplay';
import type { CrudField } from './NestedCrud';

interface AssessmentPanelProps {
  title: string;
  epId: number;
  parentId: number;
  isDraft: boolean;
  queryKey: unknown[];
  getFn: () => Promise<any>;
  createFn: (data: Record<string, unknown>) => Promise<any>;
  updateFn: (data: Record<string, unknown>) => Promise<any>;
  deleteFn: () => Promise<void>;
  onMutated: () => void;
  fields: CrudField[];
  rateOptions: { value: number; label: string }[];
  summary: (assessment: any) => ReactNode;
  emptyMessage: string;
}

export function AssessmentPanel({
  title,
  isDraft,
  queryKey,
  getFn,
  createFn,
  updateFn,
  deleteFn,
  onMutated,
  fields,
  rateOptions,
  summary,
  emptyMessage,
}: AssessmentPanelProps) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'closed' | 'edit'>('closed');
  const [form, setForm] = useState<Record<string, string | number | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: getFn,
    retry: false,
  });

  const hasAssessment = !!data && !error;

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
    mutationFn: updateFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      onMutated();
      setMode('closed');
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

  function openEdit() {
    if (!data) return;
    const initial: Record<string, string | number | boolean> = {};
    for (const f of fields) {
      const raw = data[f.name];
      if (f.type === 'checkbox') {
        initial[f.name] = Boolean(raw);
      } else if (f.type === 'number') {
        initial[f.name] = raw === null || raw === undefined ? '' : Number(raw);
      } else {
        initial[f.name] = raw === null || raw === undefined ? '' : String(raw);
      }
    }
    setForm(initial);
    setErrors({});
    setMode('edit');
  }

  function setField(name: string, value: string | number | boolean) {
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
      } else if (f.type === 'number') {
        payload[f.name] = value === '' || value === null ? null : Number(value);
      } else {
        payload[f.name] = value === '' ? null : String(value);
      }
    }

    if (mode === 'edit') {
      update.mutate(payload);
    } else {
      create.mutate(payload);
    }
  }

  function handleDelete() {
    if (window.confirm(`Delete this ${title.toLowerCase()}? This cannot be undone.`)) {
      remove.mutate();
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h4>
        {isDraft && mode === 'closed' && hasAssessment && (
          <div className="flex items-center gap-2">
            <button onClick={openEdit} className="text-xs text-blue-600 hover:underline">Edit</button>
            <span className="text-gray-300">|</span>
            <button onClick={handleDelete} disabled={isPending} className="text-xs text-red-600 hover:underline disabled:opacity-50">
              Delete
            </button>
          </div>
        )}
      </div>

      {mutationError && (
        <ErrorDisplay
          title="Save failed"
          message={(mutationError as { message?: string } | Error).message ?? 'An error occurred'}
        />
      )}

      {mode !== 'closed' && (
        <form onSubmit={handleSubmit} className="mb-2 rounded border border-blue-200 bg-blue-50/50 p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((f) => (
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
                    {(f.name === 'rate_id' ? rateOptions : f.options ?? []).map((o) => (
                      <option key={String(o.value)} value={String(o.value)}>
                        {o.label}
                      </option>
                    ))}
                  </select>
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
          <div className="mt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : mode === 'edit' ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('closed'); setForm({}); setErrors({}); }}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading && <LoadingSpinner message={`Loading ${title.toLowerCase()}...`} />}
      {!isLoading && !hasAssessment && mode === 'closed' && (
        <p className="text-xs text-gray-400">{emptyMessage}</p>
      )}
      {hasAssessment && mode === 'closed' && (
        <div className="text-sm text-gray-700">{summary(data)}</div>
      )}
    </div>
  );
}