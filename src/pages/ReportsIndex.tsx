// ═══════════════════════════════════════════════════════════════
// ReportsIndex — Landing page listing all 23 reports
// Phase 4B-9: Replaces old Dashboard report listing
// ═══════════════════════════════════════════════════════════════

import { Link } from 'react-router';
import { REPORT_GROUPS, reportsByGroup } from '../config/reportRegistry';
import { PageLayout } from '../components/PageLayout';

export function ReportsIndex() {
  return (
    <PageLayout title="Reports" subtitle="23 operational, financial, and geographic reports">
      {REPORT_GROUPS.map((group) => {
        const reports = reportsByGroup(group);
        return (
          <div key={group}>
            <h2 className="mb-3 text-lg font-semibold text-gray-800">{group}</h2>
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {reports.map((report) => (
                <Link
                  key={report.slug}
                  to={`/reports/${report.slug}`}
                  className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-md"
                >
                  <h3 className="font-medium text-gray-900">{report.label}</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {report.columns.length} columns · {report.filters.length} filters
                  </p>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </PageLayout>
  );
}
