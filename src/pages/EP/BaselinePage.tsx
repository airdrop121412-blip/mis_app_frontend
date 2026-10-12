// ═══════════════════════════════════════════════════════════════
// BaselineTablePage — dedicated page for a single baseline table
// (/baseline/:table). One List View per table: search filter +
// pagination over every record in the active project. Enabled from
// the expandable "Baseline" submenu in the sidebar.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useProject } from '../../contexts/ProjectContext';
import { PageLayout } from '../../components/PageLayout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { StatusBadge } from '../../components/StatusBadge';
import {
  baselineEps, baselineBusinesses, baselineCrops, baselineFamilyMembers, baselineGps,
  baselineInfrastructures, baselineLands, baselineTenants, baselineTrees, baselineWorkers,
  type BaselineList, type BaselineParams, type BaselineRow,
} from '../../api/baseline';
import {
  deleteEp, deleteFamilyMember, deleteLand, deleteCrop,
  deleteInfrastructure, deleteTree, deleteTenant, deleteBusiness, deleteWorker,
} from '../../api/ep';
import { BaselineEditModal } from './BaselineEditModal';

type CellValue = unknown;

function fmt(v: CellValue): string {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  if (v === 0) return '0';
  return v == null || v === '' ? '—' : String(v);
}

interface Column {
  key: string;
  label: string;
  className?: string;
  render?: (value: CellValue, row: BaselineRow) => ReactNode;
}

const epLink = (v: CellValue, row: BaselineRow) => (
  <Link
    to={`/ep/${String(row.affected_person_id ?? '')}`}
    className="font-medium text-blue-700 hover:underline"
    title="Open EP"
  >
    {fmt(v)}
  </Link>
);

const epColumn: Column = {
  key: 'ep_id',
  label: 'EP ID',
  className: 'font-mono',
  render: epLink,
};

const mainEpColumn: Column = {
  key: 'main_ep_id',
  label: 'Main EP ID',
  className: 'font-mono',
  render: epLink,
};

const epNameColumn: Column = { key: 'ep_name', label: 'EP Name' };

// ── Per-table column sets (List View) ─────────────────────────
// EP Details mirrors Step 1 (Personal Information) in EPForm.tsx.
const EPS_COLUMNS: Column[] = [
  { key: 'hh_id', label: 'HH ID', className: 'font-mono' },
  epColumn,
  { key: 'name', label: 'EP Name' },
  { key: 'father_name', label: 'F/H Name' },
  { key: 'mother_name', label: "Mother's Name" },
  { key: 'spouse_name', label: 'Spouse Name' },
  { key: 'nid_number', label: 'NID No' },
  { key: 'mobile', label: 'Mobile No' },
  { key: 'age', label: 'Age' },
  { key: 'gender', label: 'Sex' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'religion', label: 'Religion' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'district', label: 'District' },
  { key: 'upazila', label: 'Upazila' },
  { key: 'phase', label: 'Project Phase' },
  { key: 'mouza', label: 'Mouza' },
  { key: 'union_name', label: 'Union' },
  { key: 'is_household_head', label: 'HH Head?', render: (v) => fmt(v) },
  { key: 'total_family_member', label: 'Total Family' },
  { key: 'male_member', label: 'Male' },
  { key: 'female_member', label: 'Female' },
  { key: 'category_of_loss', label: 'Category of Loss' },
  { key: 'ownership', label: 'Ownership' },
  { key: 'dc_compensation', label: 'DC Comp. (৳)' },
  { key: 'cheque_no', label: 'Cheque No' },
  { key: 'cheque_date', label: 'Cheque Date' },
  { key: 'yearly_income', label: 'Yearly Income (৳)' },
  { key: 'is_disabled', label: 'Disabled', render: (v) => fmt(v) },
  { key: 'is_landless', label: 'Landless', render: (v) => fmt(v) },
  { key: 'is_tribal', label: 'Tribal', render: (v) => fmt(v) },
  { key: 'has_business_loss', label: 'Business Loss', render: (v) => fmt(v) },
  { key: 'is_tenant', label: 'Tenant?', render: (v) => fmt(v) },
  { key: 'total_tenant', label: 'Tenant No' },
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={fmt(v)} /> },
];

// Step 2 (Family Information).
const FAMILY_COLUMNS: Column[] = [
  { key: 'hh_id', label: 'HH ID', className: 'font-mono' },
  epColumn,
  epNameColumn,
  { key: 'name', label: 'Member Name' },
  { key: 'relationship', label: 'Relationship' },
  { key: 'gender', label: 'Sex' },
  { key: 'age', label: 'Age (year)' },
  { key: 'marital_status', label: 'Marital Status' },
  { key: 'education', label: 'Education' },
  { key: 'does_work', label: 'Does Work?', render: (v) => fmt(v) },
  { key: 'occupation', label: 'Occupation' },
  { key: 'annual_income', label: 'Annual Income (৳)' },
  { key: 'health_status', label: 'Health / Disability' },
  { key: 'disability_type', label: 'Disability Type' },
  { key: 'is_dependent', label: 'Dependent?', render: (v) => fmt(v) },
  { key: 'remarks', label: 'Remarks' },
];

// Step 3 (Land Information).
const LAND_COLUMNS: Column[] = [
  { key: 'hh_id', label: 'HH ID', className: 'font-mono' },
  epColumn,
  epNameColumn,
  { key: 'land_type', label: 'Land Type' },
  { key: 'land_status', label: 'Land Status' },
  { key: 'ownership_type', label: 'Ownership Type' },
  { key: 'mouza', label: 'Mouza' },
  { key: 'khatian_number', label: 'Khatian No' },
  { key: 'dag_number', label: 'Dag No' },
  { key: 'la_case_no', label: 'LA Case No' },
  { key: 'dc_pay_amount', label: 'DC Pay (৳)' },
  { key: 'dc_cheque_no', label: 'Cheque No' },
  { key: 'dc_pay_date', label: 'Cheque Date' },
  { key: 'land_area', label: 'Land Area' },
  { key: 'land_area_unit', label: 'Area Unit' },
  { key: 'land_use_type', label: 'Land Use Type' },
  { key: 'remarks', label: 'Remarks' },
];

// Step 4 (Crop Information).
const CROP_COLUMNS: Column[] = [
  { key: 'hh_id', label: 'HH ID', className: 'font-mono' },
  epColumn,
  epNameColumn,
  { key: 'crop_type', label: 'Crop Type' },
  { key: 'crop_season', label: 'Crop Season' },
  { key: 'cultivated_area', label: 'Cultivated Area' },
  { key: 'area_unit', label: 'Area Unit' },
  { key: 'damage_percentage', label: 'Damage %' },
  { key: 'mouza', label: 'Land Mouza' },
  { key: 'remarks', label: 'Remarks' },
];

// Step 5 (Structure Information).
const INFRA_COLUMNS: Column[] = [
  { key: 'hh_id', label: 'HH ID', className: 'font-mono' },
  epColumn,
  epNameColumn,
  { key: 'infrastructure_type', label: 'Structure Type' },
  { key: 'usage_type', label: 'Usage Type' },
  { key: 'structure_nature', label: 'Nature' },
  { key: 'structure_material', label: 'Material' },
  { key: 'length', label: 'Length (ft)' },
  { key: 'width', label: 'Width (ft)' },
  { key: 'area_sqft', label: 'Area (sq ft)' },
  { key: 'damage_percentage', label: 'Damage %' },
  { key: 'remarks', label: 'Remarks' },
];

// Step 6 (Tree Information).
const TREE_COLUMNS: Column[] = [
  { key: 'hh_id', label: 'HH ID', className: 'font-mono' },
  epColumn,
  epNameColumn,
  { key: 'name', label: 'Name of Tree' },
  { key: 'land_ownership', label: 'Land Ownership' },
  { key: 'tree_type', label: 'Tree Type' },
  { key: 'tree_age_category', label: 'Size' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'remarks', label: 'Remarks' },
];

// Step 7 (Tenant Information).
const TENANT_COLUMNS: Column[] = [
  { key: 'hh_id', label: 'HH ID', className: 'font-mono' },
  { key: 'ep_id', label: 'Tenant EP ID', className: 'font-mono' },
  mainEpColumn,
  epNameColumn,
  { key: 'name', label: 'Tenant Name' },
  { key: 'father_name', label: 'Father Name' },
  { key: 'nid_number', label: 'NID No' },
  { key: 'mobile', label: 'Mobile No' },
  { key: 'tenant_type', label: 'Type of Tenant' },
  { key: 'infrastructure_type', label: 'Structure' },
  { key: 'age', label: 'Age' },
  { key: 'gender', label: 'Sex' },
  { key: 'district', label: 'District' },
  { key: 'upazila', label: 'Upazila' },
  { key: 'mouza', label: 'Mouza' },
  { key: 'union_name', label: 'Union' },
  { key: 'address', label: 'Address' },
  { key: 'agreement_number', label: 'Agreement No' },
  { key: 'monthly_rent', label: 'Monthly Rent (৳)' },
  { key: 'remarks', label: 'Remarks' },
];

// Step 8 (Business Information).
const BUSINESS_COLUMNS: Column[] = [
  { key: 'hh_id', label: 'HH ID', className: 'font-mono' },
  epColumn,
  epNameColumn,
  { key: 'business_name', label: 'Business Name' },
  { key: 'ownership_code', label: 'Ownership Code' },
  { key: 'business_ownership_type', label: 'Ownership Type' },
  { key: 'business_type', label: 'Business Type' },
  { key: 'business_category', label: 'Business Category' },
  { key: 'present_address', label: 'Present Address' },
  { key: 'capital_amount', label: 'Capital (৳)' },
  { key: 'annual_income', label: 'Annual Income (৳)' },
  { key: 'has_wage_labour', label: 'Wage Labour?', render: (v) => fmt(v) },
  { key: 'number_of_wage_labour', label: 'No. of Wage Labour' },
  { key: 'has_income_tax', label: 'Income Tax?', render: (v) => fmt(v) },
  { key: 'income_tax_id', label: 'Income Tax ID' },
  { key: 'latitude', label: 'Latitude', className: 'font-mono' },
  { key: 'longitude', label: 'Longitude', className: 'font-mono' },
  { key: 'remarks', label: 'Remarks' },
];

// Step 9 (Wage Labour Information).
const WORKER_COLUMNS: Column[] = [
  { key: 'hh_id', label: 'HH ID', className: 'font-mono' },
  { key: 'ep_id', label: 'Worker EP ID', className: 'font-mono' },
  mainEpColumn,
  epNameColumn,
  { key: 'name', label: 'Worker Name' },
  { key: 'business_name', label: 'Business Owner' },
  { key: 'father_name', label: "Father's Name" },
  { key: 'mobile', label: 'Mobile No' },
  { key: 'nid_number', label: 'NID No' },
  { key: 'present_address', label: 'Present Address' },
  { key: 'total_family_member', label: 'Total Family' },
  { key: 'duration_of_employment_month', label: 'Employment (Mo)' },
  { key: 'gender', label: 'Sex' },
  { key: 'age', label: 'Age' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'employment_type', label: 'Employment Type' },
  { key: 'monthly_income', label: 'Monthly Income (৳)' },
  { key: 'remarks', label: 'Remarks' },
];

// Step 10 (GPS Location).
const GPS_COLUMNS: Column[] = [
  { key: 'hh_id', label: 'HH ID', className: 'font-mono' },
  epColumn,
  { key: 'name', label: 'EP Name' },
  { key: 'gps_latitude', label: 'GPS Latitude', className: 'font-mono' },
  { key: 'gps_longitude', label: 'GPS Longitude', className: 'font-mono' },
  { key: 'location_accuracy', label: 'Accuracy' },
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={fmt(v)} /> },
];

export interface BaselineSection {
  id: string;
  title: string;
  emoji: string;
  columns: Column[];
  /** EPDetail tab this table's records are edited in. */
  tab?: string;
  /** Deletes one record via the nested EP API. */
  deleteFn?: (row: BaselineRow) => Promise<unknown>;
  fetch: (p: BaselineParams) => Promise<BaselineList<BaselineRow>>;
}

const num = (v: unknown): number => Number(v ?? 0);

export const SECTIONS: BaselineSection[] = [
  {
    id: 'eps', title: 'EP Details', emoji: '👤', columns: EPS_COLUMNS, tab: 'personal',
    deleteFn: (r) => deleteEp(num(r.affected_person_id)), fetch: baselineEps,
  },
  {
    id: 'family-members', title: 'Family Member', emoji: '👨‍👩‍👧', columns: FAMILY_COLUMNS, tab: 'family',
    deleteFn: (r) => deleteFamilyMember(num(r.affected_person_id), num(r.family_member_id)), fetch: baselineFamilyMembers,
  },
  {
    id: 'lands', title: 'Land', emoji: '🏞️', columns: LAND_COLUMNS, tab: 'land',
    deleteFn: (r) => deleteLand(num(r.affected_person_id), num(r.land_id)), fetch: baselineLands,
  },
  {
    id: 'crops', title: 'Crop', emoji: '🌽', columns: CROP_COLUMNS, tab: 'land',
    deleteFn: (r) => deleteCrop(num(r.affected_person_id), num(r.land_id), num(r.crop_id)), fetch: baselineCrops,
  },
  {
    id: 'infrastructures', title: 'Structure', emoji: '🏠', columns: INFRA_COLUMNS, tab: 'infra',
    deleteFn: (r) => deleteInfrastructure(num(r.affected_person_id), num(r.infrastructure_id)), fetch: baselineInfrastructures,
  },
  {
    id: 'trees', title: 'Tree', emoji: '🌳', columns: TREE_COLUMNS, tab: 'trees',
    deleteFn: (r) => deleteTree(num(r.affected_person_id), num(r.tree_id)), fetch: baselineTrees,
  },
  {
    id: 'tenants', title: 'Tenant', emoji: '🏢', columns: TENANT_COLUMNS, tab: 'tenants',
    deleteFn: (r) => deleteTenant(num(r.affected_person_id), num(r.tenant_id)), fetch: baselineTenants,
  },
  {
    id: 'businesses', title: 'Business', emoji: '💼', columns: BUSINESS_COLUMNS, tab: 'business',
    deleteFn: (r) => deleteBusiness(num(r.affected_person_id), num(r.business_id)), fetch: baselineBusinesses,
  },
  {
    id: 'workers', title: 'Wage Labour', emoji: '🛠️', columns: WORKER_COLUMNS, tab: 'workers',
    deleteFn: (r) => deleteWorker(num(r.affected_person_id), num(r.worker_id)), fetch: baselineWorkers,
  },
  {
    id: 'gps', title: 'GPS Location', emoji: '📍', columns: GPS_COLUMNS, tab: 'personal',
    deleteFn: (r) => deleteEp(num(r.affected_person_id)), fetch: baselineGps,
  },
];

// ── Shared List View (search + table + pagination) ───────────
function BaselineTableView({ section, projectId }: { section: BaselineSection; projectId: number }) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('hh_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<BaselineRow | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['baseline', section.id, projectId, debounced, page, sortBy, sortDir],
    queryFn: () => section.fetch({ project_id: projectId, q: debounced, per_page: 20, page, sort_by: sortBy, sort_direction: sortDir }),
  });

  const toggleSort = (key: string) => {
    setPage(1);
    if (key === sortBy) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const rows = data?.items ?? [];
  const p = data?.pagination ?? { current_page: 1, last_page: 1, total: 0 };

  const handleDelete = async (sec: BaselineSection, row: BaselineRow, rowKey: string) => {
    if (!sec.deleteFn) return;
    const label = String(row.name ?? row.ep_id ?? row.hh_id ?? '');
    if (!window.confirm(`Delete this ${sec.title.toLowerCase()} record${label ? ` (“${label}”)` : ''}? This cannot be undone.`)) return;
    setDeletingKey(rowKey);
    try {
      await sec.deleteFn(row);
      setDeletingKey(null);
      qc.invalidateQueries({ queryKey: ['baseline', sec.id] });
      qc.invalidateQueries({ queryKey: ['ep-file-data'] });
    } catch (err) {
      setDeletingKey(null);
      alert(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="px-4 py-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${section.title}… (name, ID, any field)`}
            className="w-full max-w-md rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:max-w-lg lg:max-w-xl"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
            >
              ✕ Clear
            </button>
          )}
          <span className="ml-auto text-sm">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {p.total.toLocaleString()} records
            </span>
          </span>
        </div>

        {isLoading ? (
          <LoadingSpinner message={`Loading ${section.title}…`} />
        ) : error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {(error as Error).message}
          </p>
        ) : rows.length === 0 ? (
          <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-500">
            No {section.title.toLowerCase()} records{debounced ? ` matching “${debounced}”` : ''} in this project.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  {section.columns.map((c) => (
                    <th key={c.key} className="whitespace-nowrap px-2 py-2">
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        title={`Sort by ${c.label}`}
                        className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-gray-500 hover:text-blue-700"
                      >
                        {c.label}
                        <span className="text-[10px]">{sortBy === c.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                      </button>
                    </th>
                  ))}
                  <th className="whitespace-nowrap px-2 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const apId = Number(row.affected_person_id ?? 0);
                  const rowKey = `${i}`;
                  const busy = deletingKey === rowKey;
                  return (
                    <tr key={rowKey} className="border-b border-gray-100 last:border-0 hover:bg-blue-50/40">
                      {section.columns.map((c) => (
                        <td key={c.key} className={`whitespace-nowrap px-2 py-2 ${c.className ?? ''}`}>
                          {c.render ? c.render(row[c.key], row) : fmt(row[c.key])}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-2 py-2 text-center">
                        <div className="inline-flex items-center gap-1">
                          {apId > 0 && (
                            <button
                              type="button"
                              onClick={() => setEditingRow(row)}
                              title={`Edit ${section.title}`}
                              className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                            >
                              Edit
                            </button>
                          )}
                          {section.deleteFn && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleDelete(section, row, rowKey)}
                              className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-40"
                            >
                              {busy ? '…' : 'Delete'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {p.last_page > 1 && (
          <div className="mt-3 flex items-center justify-between gap-2 text-sm">
            <span className="text-xs text-gray-500">
              Page {p.current_page} of {p.last_page} · {p.total.toLocaleString()} records
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={p.current_page <= 1 || isFetching}
                onClick={() => setPage((pg) => Math.max(1, pg - 1))}
                className="rounded border border-gray-300 px-3 py-1 text-xs font-medium disabled:opacity-40"
              >
                ◀ Prev
              </button>
              <button
                type="button"
                disabled={p.current_page >= p.last_page || isFetching}
                onClick={() => setPage((pg) => pg + 1)}
                className="rounded border border-gray-300 px-3 py-1 text-xs font-medium disabled:opacity-40"
              >
                Next ▶
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
      {editingRow && (
        <BaselineEditModal
          sectionId={section.id}
          sectionTitle={section.title}
          emoji={section.emoji}
          row={editingRow}
          onClose={() => setEditingRow(null)}
        />
      )}
    </>
  );
}

// ── Dedicated page for one table: /baseline/:table ────────────
export function BaselineTablePage() {
  const { table } = useParams<{ table: string }>();
  const { project } = useProject();
  const projectId = project?.project_id;
  const section = SECTIONS.find((s) => s.id === table);

  if (!section) {
    return <Navigate to="/baseline" replace />;
  }

  return (
    <PageLayout
      title={`${section.emoji} ${section.title}`}
      subtitle="Every record in the active project — search any field, browse with the page controls."
    >
      <div className="mb-4">
        <Link to="/baseline" className="text-sm font-medium text-blue-700 hover:underline">
          ← Back to Baseline
        </Link>
      </div>
      {!projectId ? (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">Select a project to browse baseline data.</p>
      ) : (
        <BaselineTableView section={section} projectId={projectId} />
      )}
    </PageLayout>
  );
}