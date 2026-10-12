// ═══════════════════════════════════════════════════════════════
// EpidCodeAdminPage — Admin → EP ID Codes
// Manages the configurable short codes the EP ID builder consumes.
// Categories seeded: district, upazila, project_phase, title,
// non_tile, loss_category.
// ═══════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchEpidCodes,
  fetchEpidCodeCategories,
  createEpidCode,
  updateEpidCode,
  deleteEpidCode,
  type EpidCode,
  type EpidCodeCategoryMap,
  type EpidCodeInput,
} from '../../api/epidCodes';
import { useDistricts, masterValue } from '../../hooks/useMasters';
import type { MasterItem } from '../../types/ep';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { useProject } from '../../contexts/ProjectContext';

interface ModalState {
  category: string;
  editing: EpidCode | null;
  ownershipSubCategory?: 'title' | 'non_tile';
}

export function EpidCodeAdminPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalState | null>(null);
  const { project } = useProject();

  const categoriesQuery = useQuery({
    queryKey: ['epid-codes', 'categories'],
    queryFn: () => fetchEpidCodeCategories(),
    staleTime: 10 * 60_000,
  });

  const codesQuery = useQuery({
    queryKey: ['epid-codes', project?.project_id ?? 'all'],
    queryFn: () => fetchEpidCodes(project?.project_id ?? null),
    staleTime: 10 * 60_000,
    enabled: !!project,
  });

  const toggleMutation = useMutation({
    mutationFn: (code: EpidCode) =>
      updateEpidCode(code.epid_code_id, { is_active: !code.is_active }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['epid-codes', project?.project_id ?? 'all'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => deleteEpidCode(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['epid-codes', project?.project_id ?? 'all'] }),
  });

  const categories = categoriesQuery.data ?? {};
  const codes = codesQuery.data ?? [];

  const { items: districts } = useDistricts();

  const districtName = (id: number | null | undefined): string => {
    if (!id) return '—';
    return (
      String(districts.find((d) => masterValue(d) === id)?.name ?? '') ||
      `District #${id}`
    );
  };

const mergedCategories = useMemo(() => {
    const cats = { ...categories };
    // Merge 'title' and 'non_title'/'non_tile' into 'ownership'
    // Backend may use either spelling
    const hasTitle = cats.title;
    const hasNonTitle = cats.non_title || cats.non_tile;
    if (hasTitle || hasNonTitle) {
      cats.ownership = 'Ownership';
      delete cats.title;
      delete cats.non_title;
      delete cats.non_tile;
    }
    return cats as EpidCodeCategoryMap;
  }, [categories]);

  const mergedCodesByCategory = useMemo(() => {
    const map = new Map<string, EpidCode[]>();
    // First, populate with existing categories
    for (const code of codes) {
      if (code.category === 'title' || code.category === 'non_title' || code.category === 'non_tile') {
        // Group both under 'ownership'
        const list = map.get('ownership') ?? [];
        list.push(code);
        map.set('ownership', list);
      } else {
        const list = map.get(code.category) ?? [];
        list.push(code);
        map.set(code.category, list);
      }
    }
    return map;
  }, [codes]);

// Map to determine actual backend category for ownership items
  const getOwnershipCategory = (code: EpidCode): 'title' | 'non_tile' => {
    return code.category === 'title' ? 'title' : 'non_tile';
  };

  // Define the display order for EP ID code sections
  const sectionOrder = ['ownership', 'loss_category', 'district', 'upazila', 'project_phase'];

  // Sort categories by the defined order
  const sortedCategories = useMemo(() => {
    const entries = Object.entries(mergedCategories as EpidCodeCategoryMap);
    return entries.sort(([a], [b]) => {
      const indexA = sectionOrder.indexOf(a);
      const indexB = sectionOrder.indexOf(b);
      // Items not in the order array go to the end
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [mergedCategories]);

// Only show districts that are configured in the EP ID Codes "District"
  // section — not every row in the master district table (which may contain
  // leftover/seed data like single-letter names).
  const districtEpidCodes = useMemo(
    () => mergedCodesByCategory.get('district') ?? [],
    [mergedCodesByCategory],
  );

const filteredDistricts = useMemo(() => {
    const validNames = new Set(
      districtEpidCodes.map((c: EpidCode) => c.name),
    );
    return districts.filter((d) => validNames.has(String(d.name ?? '')));
  }, [districts, districtEpidCodes]);

  if (categoriesQuery.isLoading || codesQuery.isLoading) {
    return <LoadingSpinner message="Loading EP ID codes..." />;
  }

  if (categoriesQuery.error || codesQuery.error) {
    const error =
      (categoriesQuery.error ?? codesQuery.error) as unknown as
        | { message?: string }
        | undefined;
    return (
      <ErrorDisplay
        title="Failed to load EP ID codes"
        message={error?.message ?? 'Unknown error'}
        onRetry={() => {
          void categoriesQuery.refetch();
          void codesQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">EP ID Codes</h1>
        <p className="mt-1 text-sm text-gray-500">
          These codes are embedded in every generated EP ID. A missing code for
          a district / upazila / title / loss-category combination will block EP
          creation until it is added here.
        </p>
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
          <span className="font-semibold">EP ID format:</span>{' '}
          <code className="font-mono">District + Upazila(2) + Phase(2) + Title(1) + Loss + # + Serial(4)</code>{' '}
          — e.g. <code className="font-mono">1020122#0001</code>
        </div>
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
        sortedCategories.map(([key, label]) => {
          const items = mergedCodesByCategory.get(key) ?? [];
          const isOwnership = key === 'ownership';
          return (
            <section
              key={key}
              className="rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <header className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">{label}</h2>
                  <span className="text-xs text-gray-400">{items.length} entries</span>
                </div>
                <button
                  onClick={() => setModal({ 
                    category: isOwnership ? 'title' : key, // default to title for ownership
                    editing: null,
                    ownershipSubCategory: isOwnership ? 'title' : undefined // track which sub-category
                  })}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                >
                  <span className="text-sm leading-none">＋</span> Add
                </button>
              </header>

              {items.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-gray-400">
                  No entries yet. Add the first {label.toLowerCase()} code.
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                      <th className="px-5 py-2 font-semibold">Name</th>
                      <th className="px-5 py-2 font-semibold">Code</th>
                      {key === 'upazila' && (
                        <th className="px-5 py-2 font-semibold">District</th>
                      )}
                      <th className="px-5 py-2 font-semibold">Sort</th>
                      <th className="px-5 py-2 font-semibold">Active</th>
                      <th className="px-5 py-2 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((code) => (
                      <tr key={code.epid_code_id} className="hover:bg-gray-50">
                        <td className="px-5 py-2.5 font-medium text-gray-800">
                          {code.name}
                          {code.remarks && (
                            <div className="text-xs font-normal text-gray-400">
                              {code.remarks}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-2.5">
<code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
                          {code.code}
                        </code>
                        </td>
                        {key === 'upazila' && (
                          <td className="px-5 py-2.5 text-gray-500">
                            {districtName(code.district_id)}
                          </td>
                        )}
                        <td className="px-5 py-2.5 text-gray-500">{code.sort_order}</td>
                        <td className="px-5 py-2.5">
                          <button
                            onClick={() => toggleMutation.mutate(code)}
                            disabled={toggleMutation.isPending}
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              code.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                            title={code.is_active ? 'Click to deactivate' : 'Click to activate'}
                          >
                            {code.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
<td className="px-5 py-2.5 text-right">
                          <button
                            onClick={() => setModal({ 
                              category: isOwnership ? getOwnershipCategory(code) : key, 
                              editing: code,
                              ownershipSubCategory: isOwnership ? getOwnershipCategory(code) as 'title' | 'non_tile' : undefined
                            })}
                            className="mr-2 rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete "${code.name}" (${code.code})?`)) {
                                removeMutation.mutate(code.epid_code_id);
                              }
                            }}
                            disabled={removeMutation.isPending}
                            className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
);
        })
      )}
    
{modal && (
        <EpidCodeModal
          categoryLabel={mergedCategories[modal.category] ?? modal.category}
          categoryKey={modal.category}
          editing={modal.editing}
          districts={filteredDistricts}
          projectId={project?.project_id ?? null}
          ownershipSubCategory={modal.ownershipSubCategory}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── Add / edit modal ───────────────────────────────────────────
function EpidCodeModal({
  categoryLabel,
  categoryKey,
  editing,
  districts,
  projectId,
  ownershipSubCategory,
  onClose,
}: {
  categoryLabel: string;
  categoryKey: string;
  editing: EpidCode | null;
  districts: MasterItem[];
  projectId?: number | null;
  ownershipSubCategory?: 'title' | 'non_tile';
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isUpazila = categoryKey === 'upazila';
  const actualCategory = ownershipSubCategory ?? editing?.category ?? categoryKey;
  // Ownership Type selector only applies to Title / Non-Title ownership codes,
  // not to district, upazila, project_phase or loss_category codes.
  const isOwnership =
    !!ownershipSubCategory ||
    ['title', 'non_tile', 'non_title'].includes(editing?.category ?? '');
  
  const [form, setForm] = useState<EpidCodeInput>({
    category: actualCategory,
    name: editing?.name ?? '',
    code: editing?.code ?? '',
    district_id: editing?.district_id ?? null,
    project_id: editing?.project_id ?? projectId ?? null,
    sort_order: editing?.sort_order ?? 0,
    is_active: editing?.is_active ?? true,
    remarks: editing?.remarks ?? '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: EpidCodeInput) =>
      editing
        ? updateEpidCode(editing.epid_code_id, data)
        : createEpidCode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epid-codes', projectId ?? 'all'] });
      onClose();
    },
    onError: (err) => {
      const e = err as {
        message?: string;
        errors?: Record<string, string[]>;
      };
      const fieldErrors = e?.errors
        ? Object.entries(e.errors)
            .map(([k, v]) => `${k}: ${(v ?? []).join(', ')}`)
            .join(' · ')
        : '';
      setError(fieldErrors || e?.message || 'Failed to save EP ID code');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (
      isUpazila &&
      !form.district_id &&
      (form.district_id === null || form.district_id === undefined)
    ) {
      setError('Please select the district this upazila belongs to.');
      return;
    }
    mutation.mutate({
      ...form,
      district_id: isUpazila ? form.district_id || null : null,
      sort_order: Number(form.sort_order ?? 0),
      remarks: form.remarks?.trim() ? form.remarks.trim() : null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {editing ? 'Edit' : 'Add'} — {categoryLabel}
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
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder={categoryKey === 'district' ? 'e.g. Bogura' : categoryKey === 'upazila' ? 'e.g. Adamdighi' : categoryKey === 'project_phase' ? 'e.g. Phase A' : 'e.g. Land'}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="e.g. 1"
              maxLength={20}
              required
            />
<p className="mt-1 text-xs text-gray-400">
              Letters, digits, and hyphens only. Keep district to 1 digit, upazila
              and phase to 2 digits, title/non-tile and loss to 1 digit — this keeps
              the EP ID at exactly 7 digits before the #.
            </p>
          </div>

          {editing && isOwnership && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Ownership Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category: e.target.value }))
                }
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="title">Title</option>
                <option value="non_tile">Non-Title</option>
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Select whether this is a Title (owner) or Non-Title (non-owner) code.
              </p>
            </div>
          )}

          {isUpazila && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                District <span className="text-red-500">*</span>
              </label>
              <select
                value={form.district_id ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    district_id: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
                disabled={districts.length === 0}
              >
                <option value="">Select district...</option>
                {districts.map((d) => (
                  <option key={masterValue(d)} value={masterValue(d)}>
                    {d.name}
                  </option>
                ))}
              </select>
              {districts.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No districts configured in EP ID Codes yet. Add a district first
                  using the District section above.
                </p>
              )}
              {districts.length > 0 && (
                <p className="mt-1 text-xs text-gray-400">
                  Links this upazila code to a district so it appears in the app's
                  district-filtered upazila dropdowns.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Sort Order</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm((prev) => ({ ...prev, sort_order: Number(e.target.value) }))}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              min={0}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Remarks</label>
            <input
              type="text"
              value={form.remarks ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {!editing && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_active ?? true}
                onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              Active
            </label>
          )}

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
              {mutation.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Add Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}







