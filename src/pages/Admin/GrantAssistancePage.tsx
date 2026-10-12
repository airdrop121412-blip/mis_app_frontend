// ═══════════════════════════════════════════════════════════════
// GrantAssistancePage — Admin → Grant and Assistance
// Maintains the resettlement grant / assistance items that the EC File
// engine uses to populate the Compensation column for the LDC, DA, SRC,
// HTG, HCG, CAVHH, AVFHH, MTG, SGfT and GfWL heads.
//
// Each item supports a calculation type:
//   FIXED               → one-time amount
//   PERCENTAGE          → base × percentage%   (base = PAVC / RV_STRUCTURE)
//   FIXED_AND_PERCENTAGE→ amount + base × percentage%
//   MULTIPLIER          → total land (decimal) × multiplier  (DA)
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchGrantAssistance,
  updateGrantAssistance,
  type GrantAssistanceRow,
  type GrantAssistanceRateRow,
  type GrantCalculationType,
  type GrantPercentageBase,
} from '../../api/grantAssistance';
import { fetchLandCategoryOptions, fetchMouzaOptions } from '../../api/rateFile';
import { useDistricts, useUpazilas, masterValue, masterLabel } from '../../hooks/useMasters';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { PageLayout } from '../../components/PageLayout';
import { useProject } from '../../contexts/ProjectContext';

const CALC_TYPE_OPTIONS: Array<{ value: GrantCalculationType; label: string }> = [
  { value: 'FIXED', label: 'One-time amount' },
  { value: 'PERCENTAGE', label: 'Percentage of base' },
  { value: 'FIXED_AND_PERCENTAGE', label: 'Amount + percentage of base' },
  { value: 'MULTIPLIER', label: 'Multiplier × total land (decimal)' },
];

const BASE_OPTIONS: Array<{ value: GrantPercentageBase; label: string }> = [
  { value: 'PAVC', label: 'PAVC Amount' },
  { value: 'RV_STRUCTURE', label: 'RV for Structure (Squatters)' },
];

function money(v: string | number | null | undefined): string {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
}

export function GrantAssistancePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, GrantAssistanceRow>>({});
  const { project } = useProject();

  const isAdmin = user?.roles?.includes('ADMIN') ?? false;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['grant-assistance', project?.project_id ?? 'all'],
    queryFn: () => fetchGrantAssistance(project?.project_id ?? null),
    staleTime: 10 * 60_000,
    enabled: !!project,
  });

  const landOptionsQuery = useQuery({
    queryKey: ['rate-file', 'land-category-options'],
    queryFn: fetchLandCategoryOptions,
    staleTime: 10 * 60_000,
  });
  const landCategories = landOptionsQuery.data ?? [];

  const mouzaOptionsQuery = useQuery({
    queryKey: ['rate-file', 'mouza-options'],
    queryFn: fetchMouzaOptions,
    staleTime: 10 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: (row: GrantAssistanceRow) => {
      const payload = {
        project_id: project?.project_id ?? null,
        grant_name: row.grant_name,
        calculation_type: row.calculation_type,
        amount: Number(row.amount ?? 0),
        percentage: Number(row.percentage ?? 0),
        percentage_base: row.percentage_base,
        category: row.grant_code === 'DA' ? row.category : null,
        multiplier: Number(row.multiplier ?? 0),
        is_active: row.is_active,
        rates:
          row.grant_code === 'DA' || row.grant_code === 'CfB'
            ? (row.rates ?? []).map((r) => ({
                district_id: r.district_id ?? null,
                upazila_id: r.upazila_id ?? null,
                land_category: r.land_category ?? null,
                amount: Number(r.amount ?? 0),
                multiplier: Number(r.multiplier ?? 0),
                is_active: r.is_active,
              }))
            : undefined,
      };
      return updateGrantAssistance(row.grant_code, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grant-assistance', project?.project_id ?? 'all'] });
      setDrafts({});
    },
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading grant and assistance items..." />;
  }

  if (error) {
    const message = (error as unknown as { message?: string })?.message ?? 'Unknown error';
    return (
      <ErrorDisplay
        title="Failed to load grant and assistance"
        message={message}
        onRetry={() => void refetch()}
      />
    );
  }

  const rows = data ?? [];
  const allOptions = Array.from(
    new Set([...landCategories, ...(mouzaOptionsQuery.data ?? [])]),
  );

  function setField(code: string, patch: Partial<GrantAssistanceRow>) {
    setDrafts((prev) => {
      const base = rows.find((r) => r.grant_code === code) ?? ({} as GrantAssistanceRow);
      return { ...prev, [code]: { ...base, ...(prev[code] ?? {}), ...patch } };
    });
  }

  function rowValue(row: GrantAssistanceRow): GrantAssistanceRow {
    return drafts[row.grant_code] ?? row;
  }

  function isDirty(code: string): boolean {
    return Boolean(drafts[code]);
  }

  return (
    <PageLayout
      title="Grant and Assistance"
      subtitle="Resettlement grant / assistance items used by the EC File compensation calculation."
    >
      {!isAdmin && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          This page is available only to users with the <strong>ADMIN</strong> role.
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">Project:</span>
          <span className="px-3 py-1 rounded bg-blue-100 text-blue-800 font-mono">
            {project?.name} ({project?.project_code})
          </span>
          <a href="/projects" className="text-xs text-blue-600 hover:underline">
            Switch project
          </a>
        </div>
      </div>

      {project && (
        <>
          {rows.map((row) => {
          const form = rowValue(row);
          const dirty = isDirty(row.grant_code);
          const saving = mutation.isPending && mutation.variables?.grant_code === row.grant_code;

          return (
            <section
              key={row.grant_code}
              className="rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-5 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    {form.grant_name} <span className="text-gray-400">({form.grant_code})</span>
                  </h3>
                  <p className="text-xs text-gray-400">{explain(row.grant_code)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setField(row.grant_code, { is_active: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    Active
                  </label>
                  <button
                    onClick={() => mutation.mutate(form)}
                    disabled={!dirty || saving}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
                  </button>
                </div>
              </header>

              <div className="px-5 py-4">
                <div className="mb-3 flex flex-wrap items-end gap-x-6 gap-y-3">
                  <Field label="Calculation type">
                    <select
                      value={form.calculation_type}
                      onChange={(e) =>
                        setField(row.grant_code, {
                          calculation_type: e.target.value as GrantCalculationType,
                        })
                      }
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      {CALC_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {row.grant_code === 'DA' && (
                    <DaRateEditor
                      rates={form.rates ?? []}
                      landCategories={landCategories}
                      onChange={(rates) => setField(row.grant_code, { rates })}
                    />
                  )}

                  {row.grant_code === 'CfB' && (
                    <CfBRateEditor
                      rates={form.rates ?? []}
                      onChange={(rates) => setField(row.grant_code, { rates })}
                    />
                  )}

                  {(form.calculation_type === 'FIXED' ||
                    form.calculation_type === 'FIXED_AND_PERCENTAGE') && (
                    <Field label="One-time amount (BDT)">
                      <MoneyInput
                        value={String(form.amount ?? '')}
                        onChange={(v) => setField(row.grant_code, { amount: v })}
                      />
                    </Field>
                  )}

                  {form.calculation_type !== 'FIXED' && (
                    <>
                      <Field label="Percentage (%)">
                        <MoneyInput
                          value={String(form.percentage ?? '')}
                          onChange={(v) => setField(row.grant_code, { percentage: v })}
                          placeholder="0.00"
                        />
                      </Field>
                      {form.calculation_type !== 'MULTIPLIER' ? (
                        <Field label="Calculate on">
                          <select
                            value={form.percentage_base ?? 'PAVC'}
                            onChange={(e) =>
                              setField(row.grant_code, {
                                percentage_base: e.target.value as GrantPercentageBase,
                              })
                            }
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          >
                            {BASE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                      ) : (
                        <span className="pb-2 text-xs text-gray-400">
                          Land categories: {allOptions.length > 0 ? allOptions.join(', ') : '—'}
                        </span>
                      )}
                    </>
                  )}
                </div>

                <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  {row.calculation_type === 'FIXED' && row.grant_code === 'CfB' && (row.rates ?? []).length > 0 && (
                    <>
                      Result: district-wise one-time grant —{' '}
                      <strong className="text-gray-900">{(row.rates ?? []).length} record{(row.rates ?? []).length !== 1 ? 's' : ''}</strong>
                      {' '}(EP district not listed →{' '}
                      <strong className="text-gray-900">{money(Number(form.amount ?? 0))}</strong>)
                    </>
                  )}
                  {row.calculation_type === 'FIXED' && !(row.grant_code === 'CfB' && (row.rates ?? []).length > 0) && (
                    <>Result: <strong className="text-gray-900">{money(Number(form.amount ?? 0))}</strong></>
                  )}
                  {row.calculation_type === 'MULTIPLIER' && (
                    <>
                      {(row.rates ?? []).length > 0 ? (
                        <>
                          Result: per-land (district + upazila + category) × record multiplier,{' '}
                          <strong className="text-gray-900">{(row.rates ?? []).length} record{(row.rates ?? []).length !== 1 ? 's' : ''}</strong>
                        </>
                      ) : (
                        <>
                          Result: <strong className="text-gray-900">{money(Number(form.multiplier ?? 0))}</strong>{' '}
                          × total land quantity (in decimals)
                          {form.category ? ` — category: ${form.category}` : ''}
                        </>
                      )}
                    </>
                  )}
                  {row.calculation_type === 'PERCENTAGE' && (
                    <>
                      Result: <strong className="text-gray-900">{form.percentage || '0.00'}%</strong> of{' '}
                      <strong>{(form.percentage_base ?? 'PAVC') === 'RV_STRUCTURE' ? 'RV for Structure (Squatters)' : 'PAVC Amount'}</strong>
                    </>
                  )}
                  {row.calculation_type === 'FIXED_AND_PERCENTAGE' && (
                    <>
                      Result: <strong className="text-gray-900">{money(Number(form.amount ?? 0))}</strong>
                      {Number(form.percentage ?? 0) > 0 ? (
                        <>
                          {' '}
                          + <strong className="text-gray-900">{form.percentage}%</strong> of{' '}
                          <strong>{(form.percentage_base ?? 'PAVC') === 'RV_STRUCTURE' ? 'RV for Structure (Squatters)' : 'PAVC Amount'}</strong>
                        </>
                      ) : (
                        <span> (add a percentage to include a share of the base)</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </section>
          );
        })}
        </>
      )}
    </PageLayout>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  placeholder = '0.00',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      min={0}
      step="0.01"
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      placeholder={placeholder}
    />
  );
}

function DaRateEditor({
  rates,
  landCategories,
  onChange,
}: {
  rates: GrantAssistanceRateRow[];
  landCategories: string[];
  onChange: (rates: GrantAssistanceRateRow[]) => void;
}) {
  function addRate() {
    onChange([
      ...rates,
      { id: -Date.now(), district_id: null, district: null, upazila_id: null, upazila: null, land_category: null, amount: '0.00', multiplier: '0.00', is_active: true },
    ]);
  }

  function updateRate(index: number, patch: Partial<GrantAssistanceRateRow>) {
    onChange(rates.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRate(index: number) {
    onChange(rates.filter((_, i) => i !== index));
  }

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Rate records (district / upazila / category × multiplier)
        </label>
        <button
          type="button"
          onClick={addRate}
          className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-700"
        >
          + Add record
        </button>
      </div>
      {rates.length === 0 ? (
        <p className="text-xs text-gray-400">
          No records yet — falls back to a flat multiplier of 0.00 for all land.
        </p>
      ) : (
        <div className="space-y-2">
          {rates.map((rate, i) => (
            <DaRateRow
              key={rate.id}
              rate={rate}
              landCategories={landCategories}
              onChange={(patch) => updateRate(i, patch)}
              onRemove={() => removeRate(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DaRateRow({
  rate,
  landCategories,
  onChange,
  onRemove,
}: {
  rate: GrantAssistanceRateRow;
  landCategories: string[];
  onChange: (patch: Partial<GrantAssistanceRateRow>) => void;
  onRemove: () => void;
}) {
  const { items: districts } = useDistricts();
  const districtId = rate.district_id ? Number(rate.district_id) : null;
  const { items: upazilas } = useUpazilas(districtId);

  return (
    <div className="grid grid-cols-12 items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
      <Field label="District">
        <select
          value={rate.district_id ?? ''}
          onChange={(e) =>
            onChange({
              district_id: e.target.value ? Number(e.target.value) : null,
              upazila_id: null,
            })
          }
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
        >
          <option value="">All districts</option>
          {districts.map((d) => (
            <option key={masterValue(d)} value={masterValue(d)}>
              {masterLabel(d)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Upazila">
        <select
          value={rate.upazila_id ?? ''}
          onChange={(e) => onChange({ upazila_id: e.target.value ? Number(e.target.value) : null })}
          disabled={!districtId}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
        >
          <option value="">All upazilas</option>
          {upazilas.map((u) => (
            <option key={masterValue(u)} value={masterValue(u)}>
              {masterLabel(u)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Land Category">
        <select
          value={rate.land_category ?? ''}
          onChange={(e) => onChange({ land_category: e.target.value || null })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
        >
          <option value="">All categories</option>
          {landCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Multiplier (per decimal)">
        <MoneyInput
          value={String(rate.multiplier ?? '')}
          onChange={(v) => onChange({ multiplier: v })}
        />
      </Field>
      <div className="col-span-2 flex items-center justify-center gap-3 pb-1">
        <label className="flex items-center gap-1 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={rate.is_active}
            onChange={(e) => onChange({ is_active: e.target.checked })}
            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
          />
          Active
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

/** CfB — district-wise one-time grant amount records. */
function CfBRateEditor({
  rates,
  onChange,
}: {
  rates: GrantAssistanceRateRow[];
  onChange: (rates: GrantAssistanceRateRow[]) => void;
}) {
  function addRate() {
    onChange([
      ...rates,
      {
        id: -Date.now(),
        district_id: null,
        district: null,
        upazila_id: null,
        upazila: null,
        land_category: null,
        amount: '0.00',
        multiplier: '0.00',
        is_active: true,
      },
    ]);
  }

  function updateRate(index: number, patch: Partial<GrantAssistanceRateRow>) {
    onChange(rates.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRate(index: number) {
    onChange(rates.filter((_, i) => i !== index));
  }

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          District-wise grant records (per-district one-time amount)
        </label>
        <button
          type="button"
          onClick={addRate}
          className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-700"
        >
          + Add district
        </button>
      </div>
      {rates.length === 0 ? (
        <p className="text-xs text-gray-400">
          No district records yet — the one-time amount above is used for all districts.
        </p>
      ) : (
        <div className="space-y-2">
          {rates.map((rate, i) => (
            <CfBRateRow
              key={rate.id}
              rate={rate}
              onChange={(patch) => updateRate(i, patch)}
              onRemove={() => removeRate(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CfBRateRow({
  rate,
  onChange,
  onRemove,
}: {
  rate: GrantAssistanceRateRow;
  onChange: (patch: Partial<GrantAssistanceRateRow>) => void;
  onRemove: () => void;
}) {
  const { items: districts } = useDistricts();

  return (
    <div className="grid grid-cols-12 items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
      <Field label="District">
        <select
          value={rate.district_id ?? ''}
          onChange={(e) => onChange({ district_id: e.target.value ? Number(e.target.value) : null })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
        >
          <option value="">All districts</option>
          {districts.map((d) => (
            <option key={masterValue(d)} value={masterValue(d)}>
              {masterLabel(d)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="One-time amount (BDT) for this district">
        <MoneyInput
          value={String(rate.amount ?? '')}
          onChange={(v) => onChange({ amount: v })}
        />
      </Field>
      <div className="col-span-2 flex items-center justify-center gap-3 pb-1">
        <label className="flex items-center gap-1 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={rate.is_active}
            onChange={(e) => onChange({ is_active: e.target.checked })}
            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
          />
          Active
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

/** Human-readable summary of how the item is calculated. */
function explain(code: string): string {
  switch (code) {
    case 'LDC':
      return 'Land development cost — one-time amount or a percentage of the PAVC amount.';
    case 'DA':
      return 'Dislocation allowance — multiplier applied to the total land quantity (in decimal).';
    case 'SRC':
      return 'Stamp duty and registration cost — one-time amount.';
    case 'HTG':
    case 'HCG':
      return 'House grant — one-time amount and/or a percentage of the RV for Structure (Squatters).';
    case 'CfB':
      return 'Compensation for business loss — one-time grant amount (optionally set a different amount per district).';
    default:
      return 'One-time grant amount.';
  }
}