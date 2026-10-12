// ═══════════════════════════════════════════════════════════════
// RateManagementPage — Admin → Rate File
// Maintains the reference rates the EC File engine uses when valuing
// land, structure and tree compensation. Three sections:
//   Land      — mouza + category → DC office / PAVC rate (per decimal)
//   Structure — geo + material + usage + nature + unit → rate
//   Tree      — geo + tree type + size → rate
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchRateFile,
  fetchMaterialOptions,
  fetchUsageTypeOptions,
  fetchMouzaOptions,
  fetchLandCategoryOptions,
  createRateFile,
  updateRateFile,
  deleteRateFile,
  type RateFileType,
  type RateFileRow,
} from '../../api/rateFile';
import {
  useDistricts,
  useUpazilas,
  useLandTypes,
  useUsageTypes,
  useTreeTypes,
  masterValue,
  masterLabel,
} from '../../hooks/useMasters';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { useProject } from '../../contexts/ProjectContext';

const SECTIONS: Array<{ key: RateFileType; label: string; hint: string }> = [
  {
    key: 'land',
    label: 'Land Rate',
    hint: 'Rates per decimal, keyed by mouza and category of land.',
  },
  {
    key: 'structure',
    label: 'Structure Rate',
    hint: 'Rate per unit, keyed by geography, construction material, usage, nature and unit.',
  },
  {
    key: 'tree',
    label: 'Tree Rate',
    hint: 'Rate per tree, keyed by geography, tree type and size.',
  },
];

const MATERIAL_OPTIONS = ['Pacca', 'Semi Pacca', 'Tin Made', 'Katcha', 'Thatched'];
const NATURE_OPTIONS = ['Primary', 'Secondary'];
const UNIT_OPTIONS = ['SFT', 'CFT', 'RFT', 'Number'];
const TREE_SIZE_OPTIONS = ['Large', 'Medium', 'Small', 'Sapling'];

function formatRate(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface ModalState {
  section: RateFileType;
  editing: RateFileRow | null;
}

export function RateManagementPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalState | null>(null);
  const { project } = useProject();

  const sections = SECTIONS.map((section) => {
    const query = useQuery({
      queryKey: ['rate-file', section.key, project?.project_id ?? 'all'],
      queryFn: () => fetchRateFile(section.key, project?.project_id ?? null),
      staleTime: 10 * 60_000,
      enabled: !!project,
    });
    return { section, query };
  });

  const loading = sections.some((s) => s.query.isLoading);
  const error = sections.find((s) => s.query.error)?.query.error;

  const toggleMutation = useMutation({
    mutationFn: ({ section, row }: { section: RateFileType; row: RateFileRow }) =>
      updateRateFile(section, row.id, { is_active: !row.is_active, project_id: project?.project_id ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-file', project?.project_id ?? 'all'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ section, id }: { section: RateFileType; id: number }) =>
      deleteRateFile(section, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-file', project?.project_id ?? 'all'] });
    },
  });

  if (loading) {
    return <LoadingSpinner message="Loading rate file..." />;
  }

  if (error) {
    const message = (error as unknown as { message?: string })?.message ?? 'Unknown error';
    return (
      <ErrorDisplay
        title="Failed to load rate file"
        message={message}
        onRetry={() => {
          for (const s of sections) void s.query.refetch();
        }}
      />
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Rate File</h1>
        <p className="mt-1 text-sm text-gray-500">
          Reference rates used by EC File compensation calculations. Leave
          district / upazila empty on a structure or tree rate to make it apply
          to every location.
        </p>
      </div>

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
        sections.map(({ section, query }) => (
          <section
            key={section.key}
            className="rounded-xl border border-gray-200 bg-white shadow-sm"
          >
            <header className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">{section.label}</h2>
                <span className="text-xs text-gray-400">
                  {section.hint} — {query.data?.length ?? 0} entries
                </span>
              </div>
              <button
                onClick={() => setModal({ section: section.key, editing: null })}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
              >
                <span className="text-sm leading-none">＋</span> Add
              </button>
            </header>

            <RateTable
              section={section.key}
              rows={query.data ?? []}
              onEdit={(row) => setModal({ section: section.key, editing: row })}
              onToggle={(row) => toggleMutation.mutate({ section: section.key, row })}
              onDelete={(row) => {
                if (window.confirm(`Delete this ${section.label} entry?`)) {
                  removeMutation.mutate({ section: section.key, id: row.id });
                }
              }}
              busy={toggleMutation.isPending || removeMutation.isPending}
            />
          </section>
        )))
      }

      {modal && (
        <RateModal
          section={modal.section}
          editing={modal.editing}
          projectId={project?.project_id ?? null}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── Table ──────────────────────────────────────────────────────
function RateTable({
  section,
  rows,
  onEdit,
  onToggle,
  onDelete,
  busy,
}: {
  section: RateFileType;
  rows: RateFileRow[];
  onEdit: (row: RateFileRow) => void;
  onToggle: (row: RateFileRow) => void;
  onDelete: (row: RateFileRow) => void;
  busy: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="px-5 py-6 text-center text-sm text-gray-400">
        No rates yet. Add the first {section} rate.
      </div>
    );
  }

  const headers =
    section === 'land'
      ? ['Mouza', 'Land Category', 'DC Office /decimal', 'PAVC /decimal']
      : section === 'structure'
        ? ['District', 'Upazila', 'Material', 'Usage Type', 'Nature', 'Unit', 'Rate']
        : ['District', 'Upazila', 'Tree Type', 'Size', 'Rate'];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
            {headers.map((h) => (
              <th key={h} className="px-5 py-2 font-semibold">
                {h}
              </th>
            ))}
            <th className="px-5 py-2 font-semibold">Active</th>
            <th className="px-5 py-2 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row) => {
            let cells: React.ReactNode;
            if ('mouza' in row) {
              cells = (
                <>
                  <td className="px-5 py-2.5 font-medium text-gray-800">{row.mouza}</td>
                  <td className="px-5 py-2.5 text-gray-600">{row.land_category}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-gray-800">
                    {formatRate(row.dc_office_rate)}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-gray-800">
                    {formatRate(row.pavc_rate)}
                  </td>
                </>
              );
            } else if ('material' in row) {
              cells = (
                <>
                  <td className="px-5 py-2.5 text-gray-600">{row.district ?? 'All'}</td>
                  <td className="px-5 py-2.5 text-gray-600">{row.upazila ?? 'All'}</td>
                  <td className="px-5 py-2.5 font-medium text-gray-800">{row.material}</td>
                  <td className="px-5 py-2.5 text-gray-600">{row.usage_type}</td>
                  <td className="px-5 py-2.5 text-gray-600">{row.nature}</td>
                  <td className="px-5 py-2.5 text-gray-600">{row.unit}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-gray-800">
                    {formatRate(row.rate)}
                  </td>
                </>
              );
            } else {
              cells = (
                <>
                  <td className="px-5 py-2.5 text-gray-600">{row.district ?? 'All'}</td>
                  <td className="px-5 py-2.5 text-gray-600">{row.upazila ?? 'All'}</td>
                  <td className="px-5 py-2.5 font-medium text-gray-800">{row.tree_type}</td>
                  <td className="px-5 py-2.5 text-gray-600">{row.size}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-gray-800">
                    {formatRate(row.rate)}
                  </td>
                </>
              );
            }
            return (
              <tr key={row.id} className="hover:bg-gray-50">
                {cells}
                <td className="px-5 py-2.5">
                  <button
                    onClick={() => onToggle(row)}
                    disabled={busy}
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                    title={row.is_active ? 'Click to deactivate' : 'Click to activate'}
                  >
                    {row.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-5 py-2.5 text-right">
                  <button
                    onClick={() => onEdit(row)}
                    className="mr-2 rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(row)}
                    disabled={busy}
                    className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Add / edit modal ───────────────────────────────────────────
function RateModal({
  section,
  editing,
  projectId,
  onClose,
}: {
  section: RateFileType;
  editing: RateFileRow | null;
  projectId?: number | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [form, setForm] = useState(() => initialForm(editing, projectId));

  const { items: districts } = useDistricts();
  const { items: landTypes } = useLandTypes();
  const { items: usageTypes } = useUsageTypes();
  const { items: treeTypes } = useTreeTypes();

  const customMaterialsQuery = useQuery({
    queryKey: ['rate-file', 'material-options'],
    queryFn: fetchMaterialOptions,
    staleTime: 10 * 60_000,
  });
  const customMaterials = customMaterialsQuery.data ?? [];
  const materialOptions = Array.from(
    new Set([...MATERIAL_OPTIONS, ...customMaterials]),
  );

  const customUsageTypesQuery = useQuery({
    queryKey: ['rate-file', 'usage-type-options'],
    queryFn: fetchUsageTypeOptions,
    staleTime: 10 * 60_000,
  });
  const customUsageTypes = customUsageTypesQuery.data ?? [];
  const usageTypeOptions = Array.from(
    new Set([
      ...usageTypes
        .map((item) => masterLabel(item))
        .filter((label) => label !== 'Other'),
      ...customUsageTypes,
    ]),
  );

  const mouzaOptionsQuery = useQuery({
    queryKey: ['rate-file', 'mouza-options'],
    queryFn: fetchMouzaOptions,
    staleTime: 10 * 60_000,
  });
  const mouzaOptions = mouzaOptionsQuery.data ?? [];

  const customLandCategoriesQuery = useQuery({
    queryKey: ['rate-file', 'land-category-options'],
    queryFn: fetchLandCategoryOptions,
    staleTime: 10 * 60_000,
  });
  const customLandCategories = customLandCategoriesQuery.data ?? [];
  const landCategoryOptions = Array.from(
    new Set([
      ...landTypes
        .map((item) => masterLabel(item))
        .filter((label) => label !== 'Other'),
      ...customLandCategories,
    ]),
  );

  const districtId = form.district_id ? Number(form.district_id) : null;
  const { items: upazilas } = useUpazilas(districtId);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = buildPayload(section, form) as unknown as Parameters<typeof createRateFile>[1];
      return editing
        ? updateRateFile(section, editing.id, payload)
        : createRateFile(section, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-file', projectId ?? 'all'] });
      onClose();
    },
    onError: (err) => {
      const e = err as { message?: string; errors?: Record<string, string[]> };
      const fieldErrors = e?.errors
        ? Object.entries(e.errors)
            .map(([k, v]) => `${k}: ${(v ?? []).join(', ')}`)
            .join(' · ')
        : '';
      setError(fieldErrors || e?.message || 'Failed to save rate');
    },
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {editing ? 'Edit' : 'Add'} — {sectionTitle(section)}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {section === 'land' && (
            <>
              <Field label="Mouza" required>
                <select
                  value={String(form.mouza ?? '')}
                  onChange={(e) => set('mouza', e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select mouza...</option>
                  {mouzaOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Land Category" required>
                <select
                  value={String(form.land_category ?? '')}
                  onChange={(e) => set('land_category', e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select category...</option>
                  {landCategoryOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="DC Office Rate (per decimal)" required>
                  <MoneyInput
                    value={String(form.dc_office_rate ?? '')}
                    onChange={(v) => set('dc_office_rate', v)}
                  />
                </Field>
                <Field label="PAVC Rate (per decimal)" required>
                  <MoneyInput
                    value={String(form.pavc_rate ?? '')}
                    onChange={(v) => set('pavc_rate', v)}
                  />
                </Field>
              </div>
            </>
          )}

          {section === 'structure' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="District">
                  <select
                    value={String(form.district_id ?? '')}
                    onChange={(e) =>
                      set('district_id', e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">All districts</option>
                    {districts.map((d) => (
                      <option key={masterValue(d)} value={masterValue(d)}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Upazila">
                  <select
                    value={String(form.upazila_id ?? '')}
                    onChange={(e) =>
                      set('upazila_id', e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    disabled={!districtId}
                  >
                    <option value="">All upazilas</option>
                    {upazilas.map((u) => (
                      <option key={masterValue(u)} value={masterValue(u)}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Material" required>
                  <select
                    value={String(form.material ?? '')}
                    onChange={(e) => set('material', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Select material...</option>
                    {materialOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Usage Type" required>
                  <select
                    value={String(form.usage_type ?? '')}
                    onChange={(e) => set('usage_type', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Select usage type...</option>
                    {usageTypeOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nature" required>
                  <select
                    value={String(form.nature ?? '')}
                    onChange={(e) => set('nature', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Select nature...</option>
                    {NATURE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Unit" required>
                  <select
                    value={String(form.unit ?? '')}
                    onChange={(e) => set('unit', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Select unit...</option>
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Rate (per unit)" required>
                <MoneyInput
                  value={String(form.rate ?? '')}
                  onChange={(v) => set('rate', v)}
                />
              </Field>
            </>
          )}

          {section === 'tree' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="District">
                  <select
                    value={String(form.district_id ?? '')}
                    onChange={(e) =>
                      set('district_id', e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">All districts</option>
                    {districts.map((d) => (
                      <option key={masterValue(d)} value={masterValue(d)}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Upazila">
                  <select
                    value={String(form.upazila_id ?? '')}
                    onChange={(e) =>
                      set('upazila_id', e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    disabled={!districtId}
                  >
                    <option value="">All upazilas</option>
                    {upazilas.map((u) => (
                      <option key={masterValue(u)} value={masterValue(u)}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Tree Type" required>
                <select
                  value={String(form.tree_type ?? '')}
                  onChange={(e) => set('tree_type', e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select tree type...</option>
                  {treeTypes.map((item) => (
                    <option key={masterValue(item)} value={masterLabel(item)}>
                      {masterLabel(item)}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Size" required>
                  <select
                    value={String(form.size ?? '')}
                    onChange={(e) => set('size', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Select size...</option>
                    {TREE_SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Rate (per tree)" required>
                  <MoneyInput
                    value={String(form.rate ?? '')}
                    onChange={(v) => set('rate', v)}
                  />
                </Field>
              </div>
            </>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={Boolean(form.is_active)}
              onChange={(e) => set('is_active', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            Active
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Add Rate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function MoneyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="number"
      value={value}
      min={0}
      step="0.01"
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      placeholder="0.00"
      required
    />
  );
}

// ── Form state helpers ─────────────────────────────────────────
type FormState = Record<string, string | number | boolean | null>;

function initialForm(
  editing: RateFileRow | null,
  projectId?: number | null,
): FormState {
  const base = { is_active: true, project_id: projectId ?? null };
  if (!editing) {
    return base;
  }
  if ('mouza' in editing) {
    return {
      ...base,
      mouza: editing.mouza,
      land_category: editing.land_category,
      dc_office_rate: editing.dc_office_rate,
      pavc_rate: editing.pavc_rate,
      is_active: editing.is_active,
    };
  }
  const geo = {
    ...base,
    district_id: editing.district_id ?? '',
    upazila_id: editing.upazila_id ?? '',
    is_active: editing.is_active,
  };
  if ('material' in editing) {
    return {
      ...geo,
      material: editing.material,
      usage_type: editing.usage_type,
      nature: editing.nature,
      unit: editing.unit,
      rate: editing.rate,
    };
  }
  return {
    ...geo,
    tree_type: editing.tree_type,
    size: editing.size,
    rate: editing.rate,
  };
}

function buildPayload(
  section: RateFileType,
  form: FormState,
): Record<string, unknown> {
  if (section === 'land') {
    return {
      project_id: form.project_id ?? null,
      mouza: String(form.mouza ?? '').trim(),
      land_category: String(form.land_category ?? '').trim(),
      dc_office_rate: Number(form.dc_office_rate ?? 0),
      pavc_rate: Number(form.pavc_rate ?? 0),
      is_active: Boolean(form.is_active),
    };
  }
  const geo = {
    project_id: form.project_id ?? null,
    district_id: form.district_id ? Number(form.district_id) : null,
    upazila_id: form.upazila_id ? Number(form.upazila_id) : null,
    is_active: Boolean(form.is_active),
  };
  if (section === 'structure') {
    return {
      ...geo,
      material: String(form.material ?? ''),
      usage_type: String(form.usage_type ?? ''),
      nature: String(form.nature ?? ''),
      unit: String(form.unit ?? ''),
      rate: Number(form.rate ?? 0),
    };
  }
  return {
    ...geo,
    tree_type: String(form.tree_type ?? ''),
    size: String(form.size ?? ''),
    rate: Number(form.rate ?? 0),
  };
}

function sectionTitle(section: RateFileType): string {
  return SECTIONS.find((s) => s.key === section)?.label ?? section;
}