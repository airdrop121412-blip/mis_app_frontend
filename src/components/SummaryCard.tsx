// ═══════════════════════════════════════════════════════════════
// SummaryCard — Renders report summary key/value pairs
// Handles both standard scalar summaries and R22 entity_totals.
// ═══════════════════════════════════════════════════════════════

import { formatSummaryValue, formatInteger } from '../utils/format';

interface SummaryCardProps {
  summary: Record<string, unknown>;
  hasEntityTotals: boolean;
}

export function SummaryCard({ summary, hasEntityTotals }: SummaryCardProps) {
  // R22 special case: entity_totals is an object
  if (hasEntityTotals && summary.entity_totals) {
    const totals = summary.entity_totals as Record<string, number>;
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">
          Entity Totals
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(totals).map(([entity, count]) => (
            <div key={entity} className="rounded bg-gray-50 p-3 text-center">
              <div className="text-lg font-bold text-gray-900">
                {formatInteger(count)}
              </div>
              <div className="text-xs text-gray-500">{entity}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Standard scalar summaries
  const entries = Object.entries(summary).filter(
    ([key]) => key !== 'entity_totals',
  );
  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Summary</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded bg-gray-50 p-3 text-center">
            <div className="text-lg font-bold text-gray-900">
              {formatSummaryValue(key, value)}
            </div>
            <div className="text-xs text-gray-500">
              {key.replace(/_/g, ' ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
