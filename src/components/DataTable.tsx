// ═══════════════════════════════════════════════════════════════
// DataTable — Generic report table component
// Renders columns from config, formats values by type.
// ═══════════════════════════════════════════════════════════════

import type { ReportColumn } from '../types/api';
import { formatCell } from '../utils/format';

interface DataTableProps {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
}

export function DataTable({ columns, rows }: DataTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
        No data available.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-gray-50">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="whitespace-nowrap px-4 py-3 text-sm text-gray-900"
                >
                  {formatCell(row[col.key], col.type)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
