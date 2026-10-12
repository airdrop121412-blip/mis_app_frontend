// ═══════════════════════════════════════════════════════════════
// ExportButton — Downloads CSV via the export endpoint
// Uses fetch + blob to preserve Authorization header.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { buildExportUrl } from '../api/reports';
import type { ReportFilters } from '../types/api';

interface ExportButtonProps {
  slug: string;
  filters: ReportFilters;
}

export function ExportButton({ slug, filters }: ExportButtonProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleExport() {
    const url = buildExportUrl(slug, filters);
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    setDownloading(true);
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition') ?? '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] ?? `${slug}.csv`;

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      onClick={() => void handleExport()}
      disabled={downloading}
      className="inline-flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {downloading ? 'Exporting...' : 'Export CSV'}
    </button>
  );
}
