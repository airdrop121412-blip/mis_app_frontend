import { Link } from 'react-router';
import { useState } from 'react';
import { PageLayout } from '../components/PageLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { useCorrectionHistoryList } from '../hooks/useCorrection';
import { useProject } from '../contexts/ProjectContext';
import { formatTimestamp } from '../utils/format';

export function CorrectionHistoryListPage() {
  const { project } = useProject();
  const [search, setSearch] = useState('');
  const [changeType, setChangeType] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useCorrectionHistoryList({
    project_id: project?.project_id, q: search || undefined, change_type: changeType || undefined, page, per_page: 25,
  });
  const rows = data?.items ?? [];
  const pagination = data?.pagination;

  return <PageLayout title="Correction History" subtitle="Audit record of approved EP edits and deletes" actions={
    <Link to="/corrections" className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">← Correction</Link>
  }>
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap gap-3">
        <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="HH ID, EP ID, user, cause..." className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm sm:w-80" />
        <select value={changeType} onChange={(event) => { setChangeType(event.target.value); setPage(1); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All actions</option><option value="EDIT">Edit</option><option value="DELETE">Delete</option>
        </select>
      </div>
      {isLoading ? <LoadingSpinner message="Loading correction history..." /> : error ? (
        <ErrorDisplay message={error instanceof Error ? error.message : 'Failed to load correction history'} onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon="🕐" title="No correction history" message="No approved EP corrections have been recorded for this project." />
      ) : <>
        <div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"><tr>
            <th className="px-3 py-3">HH ID</th><th className="px-3 py-3">EP ID</th><th className="px-3 py-3">Action</th><th className="px-3 py-3">Field</th><th className="px-3 py-3">Cause</th><th className="px-3 py-3">User</th><th className="px-3 py-3">Date & time</th>
          </tr></thead>
          <tbody>{rows.map((row) => <tr key={row.correction_audit_id} className="border-t border-gray-100 align-top hover:bg-blue-50/30">
            <td className="px-3 py-3 font-mono">{row.hh_id ?? '—'}</td><td className="px-3 py-3 font-mono">{row.ep_id ?? '—'}</td>
            <td className="px-3 py-3"><span className={`rounded px-2 py-1 text-xs font-medium ${row.change_type === 'DELETE' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{row.change_type}</span></td>
            <td className="px-3 py-3 font-mono text-xs">{row.field_name}</td><td className="max-w-sm px-3 py-3">{row.cause}</td>
            <td className="px-3 py-3">{row.user_display ?? row.user_email ?? row.user_name ?? row.user_username ?? (row.user_id ? `User #${row.user_id}` : '—')}</td>
            <td className="whitespace-nowrap px-3 py-3 text-gray-500">{formatTimestamp(row.corrected_at)}</td>
          </tr>)}</tbody>
        </table></div>
        {pagination && pagination.last_page > 1 && <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-50">Previous</button>
          <span className="text-gray-500">Page {pagination.current_page} of {pagination.last_page}</span>
          <button type="button" onClick={() => setPage((value) => value + 1)} disabled={page >= pagination.last_page} className="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-50">Next</button>
        </div>}
      </>}
    </div>
  </PageLayout>;
}