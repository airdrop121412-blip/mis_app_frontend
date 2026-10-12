// ═══════════════════════════════════════════════════════════════
// CorrectionHistoryPage — Audit history for a specific entity
// Phase F
// ═══════════════════════════════════════════════════════════════

import { Link, useParams } from 'react-router';
import { PageLayout } from '../components/PageLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { EmptyState } from '../components/EmptyState';
import { useCorrectionHistory } from '../hooks/useCorrection';
import { formatDate } from '../utils/format';

export function CorrectionHistoryPage() {
  const { entityType = '', entityId = '' } = useParams();
  const { data, isLoading, error, refetch } = useCorrectionHistory(
    entityType.toUpperCase(),
    entityId ? Number(entityId) : null
  );

  return (
    <PageLayout
      title={`Correction History — ${entityType.toUpperCase()} #${entityId}`}
      subtitle="Complete audit trail of field-level corrections for this entity"
      actions={
        <Link
          to="/corrections"
          className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back to list
        </Link>
      }
    >
      {isLoading && <LoadingSpinner message="Loading correction history..." />}

      {error && (
        <ErrorDisplay
          message={error instanceof Error ? error.message : 'Failed to load history'}
          onRetry={() => refetch()}
        />
      )}

      {data && data.length === 0 && !isLoading && (
        <EmptyState
          icon="🕐"
          title="No corrections recorded"
          message="This entity has no field-level corrections yet."
        />
      )}

      {data && data.length > 0 && (
        <div className="space-y-4">
          {data.map((row) => (
            <div key={row.correction_audit_id} className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {row.entity_type}
                  </span>
                  <span className="font-mono text-sm font-medium text-gray-900">{row.field_name}</span>
                  {row.financial_impact && (
                    <span className="inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Financial
                    </span>
                  )}
                  {row.authorized ? (
                    <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Authorized
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Not authorized
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{formatDate(row.corrected_at)}</span>
              </div>

              {/* Before / After */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Before</p>
                  <p className="mt-1 break-words font-mono text-sm text-gray-700">
                    {row.old_value ?? <span className="text-gray-400">(empty)</span>}
                  </p>
                </div>
                <div className="rounded-md bg-blue-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-400">After</p>
                  <p className="mt-1 break-words font-mono text-sm text-blue-800">
                    {row.new_value ?? <span className="text-blue-400">(empty)</span>}
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div className="mt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Reason</p>
                <p className="mt-1 text-sm text-gray-700">{row.correction_reason}</p>
              </div>

              {/* Actors */}
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                <span>
                  Corrected by:{' '}
                  <span className="font-medium text-gray-700">
                    {row.corrected_by_user?.full_name ?? `User #${row.corrected_by ?? '—'}`}
                  </span>
                </span>
                {row.authorized && (
                  <span>
                    Authorized by:{' '}
                    <span className="font-medium text-gray-700">
                      {row.authorized_by_user?.full_name ?? `User #${row.authorized_by ?? '—'}`}
                    </span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}