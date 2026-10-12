// ═══════════════════════════════════════════════════════════════
// InvalidEpsPage — List all EPs whose EP ID cannot be generated (blank/invalid/duplicate NID)
// Click an EP to see the exact cause and edit it to fix the issue.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Link } from 'react-router';
import { useInvalidEps, useDeleteDraftEps } from '../../hooks/useEp';
import { useProject } from '../../contexts/ProjectContext';
import { PageLayout } from '../../components/PageLayout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { EmptyState } from '../../components/EmptyState';
import { formatInteger } from '../../utils/format';
import type { InvalidEp } from '../../api/ep';

export function InvalidEpsPage() {
  const { project } = useProject();
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useInvalidEps({
    project_id: project?.project_id,
    per_page: 25,
    page,
  });

  const deleteDrafts = useDeleteDraftEps();

      function handleDeleteDrafts() {
    if (!window.confirm('Delete ALL draft EPs in this project? This cannot be undone.')) return;
    deleteDrafts.mutate(project?.project_id);
  }

  return (
    <PageLayout
      title="Invalid EPs — Data Quality"
      subtitle="EPs whose EP ID cannot be generated (blank, invalid, or duplicate NID)"
      actions={
        <button
          onClick={handleDeleteDrafts}
          disabled={deleteDrafts.isPending}
          className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {deleteDrafts.isPending ? 'Deleting...' : 'Delete All Draft'}
        </button>
      }
    >
      {isLoading && <LoadingSpinner message="Loading invalid EPs..." />}

      {error && (
        <ErrorDisplay
          message={error instanceof Error ? error.message : 'Failed to load invalid EPs'}
          onRetry={() => refetch()}
        />
      )}

      {data && (
        <>
          <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-700">
              Showing <strong>{data.items?.length ?? 0}</strong> of{' '}
              <strong>{formatInteger(data.pagination?.total ?? 0)}</strong> invalid EPs.
              Click <span className="font-medium">Edit</span> on any row to open the EP
              form and fix the listed issue(s).
            </p>
          </div>

          {data.items.length === 0 ? (
            <EmptyState message="No invalid EPs found. All EPs have valid NID and Mobile numbers." />
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">EP ID Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.items.map((ep: InvalidEp) => (
                      <tr key={ep.ep_id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-900">
                          {ep.ep_id_code ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                          {ep.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {ep.issues.map((issue, idx) => (
                            <span
                              key={idx}
                              className={`inline-block text-xs mr-2 mb-1 px-2 py-1 rounded ${
                                issue.severity === 'error'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {issue.field}: {issue.message}
                            </span>
                          ))}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                          <Link
                            to={`/ep/${ep.ep_id}/edit`}
                            className="text-blue-600 hover:underline"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(data.pagination.last_page ?? 1) > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
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
        </>
      )}
    </PageLayout>
  );
}
