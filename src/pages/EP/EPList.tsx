// ═══════════════════════════════════════════════════════════════
// EPList — Browse, search, and filter all Affected Persons
// Phase 4B-10B
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Link } from 'react-router';
import { useEpList, useDeleteEp, useDeleteDraftEps } from '../../hooks/useEp';
import { useDistricts, useUpazilas } from '../../hooks/useMasters';
import { useProject } from '../../contexts/ProjectContext';
import { PageLayout } from '../../components/PageLayout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { EmptyState } from '../../components/EmptyState';
import { StatusBadge } from '../../components/StatusBadge';
import { formatMoney } from '../../utils/format';

export function EPList() {
  const { project } = useProject();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [upazilaId, setUpazilaId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const { items: districts } = useDistricts();
  const { items: upazilas } = useUpazilas(districtId);

  const { data, isLoading, error, refetch } = useEpList({
    project_id: project?.project_id,
    q: search || undefined,
    status: status || undefined,
    district_id: districtId ?? undefined,
    upazila_id: upazilaId ?? undefined,
    per_page: 25,
    page,
  });

  const deleteEp = useDeleteEp();
  const deleteDrafts = useDeleteDraftEps();

  function handleDelete(id: number, name: string) {
    if (window.confirm(`Delete EP "${name}"? This cannot be undone.`)) {
      deleteEp.mutate(id);
    }
  }

  function handleDeleteDrafts() {
    if (window.confirm('Delete ALL draft EPs in this project? This cannot be undone.')) {
      deleteDrafts.mutate(project?.project_id);
    }

  }

  return (
    <PageLayout
      title="Affected Persons (EP)"
      subtitle="Create, search, and manage EP records"
      actions={
        <div className="flex gap-2">
          <Link
            to="/ep/new"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New EP
          </Link>
          <button
            onClick={handleDeleteDrafts}
            disabled={deleteDrafts.isPending}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleteDrafts.isPending ? "Deleting..." : "Delete All Draft"}
          </button>
        </div>
      }
    >
      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="EP ID, name, NID..."
            className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Status</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="VERIFIED">Verified</option>
            <option value="APPROVED">Approved</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">District</label>
          <select
            value={districtId ?? ''}
            onChange={(e) => {
              setDistrictId(e.target.value ? Number(e.target.value) : null);
              setUpazilaId(null);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All</option>
            {districts.map((d) => (
              <option key={Number(d.district_id)} value={Number(d.district_id)}>
                {String(d.name)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Upazila</label>
          <select
            value={upazilaId ?? ''}
            onChange={(e) => { setUpazilaId(e.target.value ? Number(e.target.value) : null); setPage(1); }}
            disabled={!districtId}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
          >
            <option value="">All</option>
            {upazilas.map((u) => (
              <option key={Number(u.upazila_id)} value={Number(u.upazila_id)}>
                {String(u.name)}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => refetch()}
          className="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      {isLoading && <LoadingSpinner message="Loading EPs..." />}

      {error && (
        <ErrorDisplay
          message={error instanceof Error ? error.message : 'Failed to load EPs'}
          onRetry={() => refetch()}
        />
      )}

      {data && data.items.length === 0 && !isLoading && (
        <EmptyState
          title="No EPs found"
          message="No affected persons match your filters. Try adjusting your search or create a new EP."
          action={
            <Link
              to="/ep/new"
              className="inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Create First EP
            </Link>
          }
        />
      )}

      {data && data.items.length > 0 && (
        <>
          <p className="text-sm text-gray-500">
            {data.pagination.total ?? data.items.length} record{data.items.length !== 1 ? 's' : ''}
          </p>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">HH ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">EP ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Father</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">NID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">District</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Upazila</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Income</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {data.items.map((ep) => (
                  <tr key={ep.affected_person_id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-900">
                      <Link to={`/ep/${ep.affected_person_id}`} className="text-blue-600 hover:underline">
                        {ep.hh_id ?? '—'}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-900">
                      <Link to={`/ep/${ep.affected_person_id}`} className="text-blue-600 hover:underline">
                        {ep.ep_id ?? '—'}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{ep.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{ep.father_name ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-500">{ep.nid_number}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{ep.district ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{ep.upazila ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm"><StatusBadge status={ep.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{formatMoney(ep.monthly_income)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      <Link to={`/ep/${ep.affected_person_id}`} className="text-blue-600 hover:underline">View</Link>
                      {ep.status === 'DRAFT' && (
                        <>
                          <span className="mx-1 text-gray-300">|</span>
                          <Link to={`/ep/${ep.affected_person_id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                          <span className="mx-1 text-gray-300">|</span>
                          <button
                            onClick={() => handleDelete(ep.affected_person_id, ep.name)}
                            disabled={deleteEp.isPending}
                            className="text-red-600 hover:underline disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ──────────────────────────────────── */}
          {data.pagination.last_page && data.pagination.last_page > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {data.pagination.current_page} of {data.pagination.last_page}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= (data.pagination.last_page ?? 1)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}
