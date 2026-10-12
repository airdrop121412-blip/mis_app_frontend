// ═══════════════════════════════════════════════════════════════
// ReportPage — Generic report page (the core of the frontend)
// Looks up config from REPORT_REGISTRY, renders filters + table
// + summary + export. R22 gets special summary handling.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useParams } from 'react-router';
import { REPORT_BY_SLUG } from '../config/reportRegistry';
import { useReport } from '../hooks/useReport';
import { DataTable } from '../components/DataTable';
import { FilterPanel } from '../components/FilterPanel';
import { SummaryCard } from '../components/SummaryCard';
import { ExportButton } from '../components/ExportButton';
import type { ReportFilters } from '../types/api';

export function ReportPage() {
  const { slug } = useParams<{ slug: string }>();
  const config = slug ? REPORT_BY_SLUG[slug] : undefined;
  const [filters, setFilters] = useState<ReportFilters>({});

  if (!config) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Report Not Found
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            No report registered with slug "{slug}"
          </p>
        </div>
      </div>
    );
  }

  const { dataset, isLoading, error } = useReport(config, filters);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{config.label}</h1>
          <p className="text-sm text-gray-500">{config.group}</p>
        </div>
        <ExportButton slug={config.slug} filters={filters} />
      </div>

      {/* Filters */}
      <FilterPanel
        filters={config.filters}
        values={filters}
        onChange={setFilters}
      />

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Error: {error.message}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        </div>
      )}

      {/* Data */}
      {dataset && !isLoading && (
        <>
          {/* Summary */}
          <SummaryCard
            summary={dataset.summary}
            hasEntityTotals={config.hasEntityTotals}
          />

          {/* Row count */}
          <p className="text-sm text-gray-500">
            {dataset.rows.length} row{dataset.rows.length !== 1 ? 's' : ''}
          </p>

          {/* Table */}
          <DataTable columns={dataset.columns} rows={dataset.rows} />
        </>
      )}
    </div>
  );
}
