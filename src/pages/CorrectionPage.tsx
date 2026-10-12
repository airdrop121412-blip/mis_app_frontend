// ═══════════════════════════════════════════════════════════════
// CorrectionPage — Admin correction of APPROVED EPs.
//
// Approved records are locked by design; this screen is the only way to
// change them. It lists APPROVED EPs (PAID EPs belong to the additional
// payment workflow and never appear here) and offers two actions:
//
//   Edit   → ask WHY, then open the 10-step EP wizard (EP Information →
//            GPS Location) in a modal. The reason is written to Correction
//            History together with every changed field.
//   Delete → ask WHY, then hard-delete the record. Refused by the backend
//            when the EP already has recorded payments.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Link } from 'react-router';
import { PageLayout } from '../components/PageLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { CorrectionReasonModal, type CorrectionAction } from '../components/CorrectionReasonModal';
import { CorrectionEditModal } from '../components/CorrectionEditModal';
import { useCorrectionEps, useDeleteCorrectionEp } from '../hooks/useCorrection';
import { useAuth } from '../hooks/useAuth';
import { useProject } from '../contexts/ProjectContext';
import type { CorrectionEpRow } from '../types/validation';

const COLUMNS = [
  'HH ID',
  'EP ID',
  'Name',
  'Father Name',
  'NID No',
  'Mobile No',
  'Mouza',
  'Union',
  'Upazila',
  'District',
  'Loss Category',
  'Status',
  'Action',
];

export function CorrectionPage() {
  const { project } = useProject();
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('ADMIN') ?? false;

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useCorrectionEps({
    project_id: project?.project_id,
    q: search || undefined,
    page,
    per_page: 25,
  });

  const deleteMutation = useDeleteCorrectionEp();

  // Which row the reason prompt is open for, and which action it belongs to.
  const [reasonTarget, setReasonTarget] = useState<{ action: CorrectionAction; row: CorrectionEpRow } | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  // The wizard opens only after a reason has been captured.
  const [editTarget, setEditTarget] = useState<{ row: CorrectionEpRow; reason: string } | null>(null);

  const rows = data?.items ?? [];
  const pagination = data?.pagination;

  function openReason(action: CorrectionAction, row: CorrectionEpRow) {
    setReasonError(null);
    setReasonTarget({ action, row });
  }

  function handleReasonConfirm(reason: string) {
    if (!reasonTarget) return;
    setReasonError(null);

    if (reasonTarget.action === 'delete') {
      deleteMutation.mutate(
        { affectedPersonId: reasonTarget.row.affected_person_id, reason },
        {
          onSuccess: () => setReasonTarget(null),
          onError: (cause) =>
            setReasonError(cause instanceof Error ? cause.message : 'Correction delete failed'),
        },
      );
      return;
    }

    // Edit: keep the reason and open the wizard. The reason is persisted by
    // the correction endpoint when the change is actually saved.
    setEditTarget({ row: reasonTarget.row, reason });
    setReasonTarget(null);
  }

  return (
    <>
      <PageLayout
      title="Correction"
      subtitle="Admin correction of locked APPROVED EPs — every change is written to Correction History"
      actions={
        <Link
          to="/corrections/history"
          className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Correction History →
        </Link>
      }
    >
      {!isAdmin && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Only an administrator can correct an APPROVED EP. You can view this list, but Edit and
          Delete will be refused.
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Approved EPs</h2>
            <p className="text-xs text-gray-500">
              Only APPROVED records are listed. PAID EPs are handled by the
              additional-payment workflow.
            </p>
          </div>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="HH ID, EP ID, name, NID..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm sm:w-72"
          />
        </div>

        {isLoading ? (
          <LoadingSpinner message="Loading approved EPs..." />
        ) : error ? (
          <div className="space-y-3">
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error instanceof Error ? error.message : 'Failed to load approved EPs.'}
            </p>
            <button
              onClick={() => refetch()}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="✅"
            title="No approved EPs"
            message="There are no APPROVED EPs waiting for correction in this project."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[1400px] w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    {COLUMNS.map((label) => (
                      <th key={label} className="whitespace-nowrap px-3 py-3">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.affected_person_id}
                      className="border-t border-gray-100 hover:bg-blue-50/30"
                    >
                      <td className="px-3 py-3 font-mono">{row.hh_id ?? '—'}</td>
                      <td className="px-3 py-3 font-mono">{row.ep_id ?? '—'}</td>
                      <td className="px-3 py-3 font-medium">{row.name}</td>
                      <td className="px-3 py-3">{row.father_name ?? '—'}</td>
                      <td className="px-3 py-3">{row.nid_number}</td>
                      <td className="px-3 py-3">{row.mobile}</td>
                      <td className="px-3 py-3">{row.mouza ?? '—'}</td>
                      <td className="px-3 py-3">{row.union_name ?? '—'}</td>
                      <td className="px-3 py-3">{row.upazila ?? '—'}</td>
                      <td className="px-3 py-3">{row.district ?? '—'}</td>
                      <td className="px-3 py-3">{row.category_of_loss ?? '—'}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={!isAdmin}
                          onClick={() => openReason('edit', row)}
                          className="rounded border border-blue-300 px-2 py-1 text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={!isAdmin}
                          onClick={() => openReason('delete', row)}
                          className="ml-2 rounded border border-red-300 px-2 py-1 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.last_page > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                  disabled={page <= 1}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {pagination.current_page} of {pagination.last_page} · {pagination.total} EP
                  {pagination.total === 1 ? '' : 's'}
                </span>
                <button
                  onClick={() => setPage((previous) => previous + 1)}
                  disabled={page >= (pagination.last_page ?? 1)}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
      </PageLayout>

      <CorrectionReasonModal
        open={!!reasonTarget}
        action={reasonTarget?.action ?? 'edit'}
        hhId={reasonTarget?.row.hh_id ?? null}
        epCode={reasonTarget?.row.ep_id ?? null}
        name={reasonTarget?.row.name ?? ''}
        isPending={deleteMutation.isPending}
        error={reasonError}
        onCancel={() => { if (!deleteMutation.isPending) { setReasonTarget(null); setReasonError(null); } }}
        onConfirm={handleReasonConfirm}
      />
      <CorrectionEditModal
        open={!!editTarget}
        affectedPersonId={editTarget?.row.affected_person_id ?? null}
        hhId={editTarget?.row.hh_id ?? null}
        epCode={editTarget?.row.ep_id ?? null}
        name={editTarget?.row.name ?? ''}
        reason={editTarget?.reason ?? ''}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); void refetch(); }}
      />
    </>
  );
}
