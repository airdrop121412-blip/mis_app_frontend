// ═══════════════════════════════════════════════════════════════
// useReport — TanStack Query hook for report data fetching
// ═══════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { fetchReport } from '../api/reports';
import type { ReportFilters, ReportDataset } from '../types/api';
import type { ReportConfig } from '../config/reportRegistry';

interface UseReportResult {
  dataset: ReportDataset | null;
  meta: Record<string, unknown>;
  isLoading: boolean;
  error: Error | null;
}

export function useReport(
  config: ReportConfig,
  filters: ReportFilters,
): UseReportResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['report', config.slug, filters],
    queryFn: () => fetchReport(config.slug, filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    dataset: data?.dataset ?? null,
    meta: data?.meta ?? {},
    isLoading,
    error: error instanceof Error ? error : null,
  };
}
