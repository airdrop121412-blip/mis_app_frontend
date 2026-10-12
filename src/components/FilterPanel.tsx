// ═══════════════════════════════════════════════════════════════
// FilterPanel — Generic filter controls for report pages
// Derives filter UI from ReportConfig.filters[]
// ═══════════════════════════════════════════════════════════════

import type { FilterDefinition } from '../config/reportRegistry';
import type { ReportFilters } from '../types/api';

interface FilterPanelProps {
  filters: FilterDefinition[];
  values: ReportFilters;
  onChange: (values: ReportFilters) => void;
}

export function FilterPanel({ filters, values, onChange }: FilterPanelProps) {
  function updateFilter(name: string, value: string) {
    onChange({ ...values, [name]: value || undefined });
  }

  function clearAll() {
    onChange({});
  }

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4">
      {filters.map((filter) => (
        <div key={filter.name} className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">
            {filter.label}
          </label>
          {filter.options ? (
            <select
              value={String(values[filter.name as keyof ReportFilters] ?? '')}
              onChange={(e) => updateFilter(filter.name, e.target.value)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">All</option>
              {filter.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : filter.type === 'date' ? (
            <input
              type="date"
              value={String(values[filter.name as keyof ReportFilters] ?? '')}
              onChange={(e) => updateFilter(filter.name, e.target.value)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          ) : (
            <input
              type="number"
              placeholder={filter.placeholder ?? filter.label}
              value={String(values[filter.name as keyof ReportFilters] ?? '')}
              onChange={(e) => updateFilter(filter.name, e.target.value)}
              className="w-32 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          )}
        </div>
      ))}
      <button
        onClick={clearAll}
        className="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200"
      >
        Clear
      </button>
    </div>
  );
}
