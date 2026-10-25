// ═══════════════════════════════════════════════════════
// EPImportTablePage — Simple one-table-at-a-time import
// ═══════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { Upload, Trash2, AlertTriangle, FileSpreadsheet, UsersRound, Landmark, Database, LayoutDashboard, Wallet, UserRound, MapPin, CheckCircle } from 'lucide-react';
import { Upload, Trash2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { PageLayout } from '../../components/PageLayout';
import { useAuth } from '../../hooks/useAuth';
import { useProject } from '../../contexts/ProjectContext';
import {
  downloadEpImportTemplate,
  importEpStep,
  clearEpStep,
  countEpStep,
  type EpStepImportResult,
  type EpImportRowError,
} from '../../api/epImport';
import type { ApiError } from '../../api/client';

interface ImportTable {
  key: string;
  label: string;
  en: string;
  icon: 'Ep' | 'Family' | 'Land' | 'Crop' | 'Structure' | 'Tree' | 'Tenant' | 'Business' | 'Worker' | 'Gps';
}

const IMPORT_TABLES: ImportTable[] = [
  { key: 'ep', label: 'EP Upload', en: 'EP Data', icon: 'Ep' },
  { key: 'family', label: 'Family', en: 'পরিবার (Family)', icon: 'Family' },
  { key: 'land', label: 'Land', en: 'আবাদি জমি (Land)', icon: 'Land' },
  { key: 'crop', label: 'Crop', en: 'ফসল (Crop)', icon: 'Crop' },
  { key: 'structure', label: 'Structure', en: 'কাঠামো (Structure)', icon: 'Structure' },
  { key: 'tree', label: 'Tree', en: 'গাছ (Tree)', icon: 'Tree' },
  { key: 'tenant', label: 'Tenant', en: 'ভাড়াটিয়া (Tenant)', icon: 'Tenant' },
  { key: 'business', label: 'Business', en: 'ব্যবসা (Business)', icon: 'Business' },
  { key: 'worker', label: 'Worker', en: 'শ্রমিক (Worker)', icon: 'Worker' },
  { key: 'gps', label: 'GPS Location', en: 'GPS তথ্য (GPS)', icon: 'Gps' },
];

interface TableState {
  table: ImportTable;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  total: number;
  imported: number;
  skipped: number;
  errors: EpImportRowError[];
  message: string | null;
  lastError: string | null;
}

function tableIcon(icon: ImportTable['icon']) {
  const icons: Record<ImportTable['icon'], React.ElementType> = {
    Ep: FileSpreadsheet,
    Family: UsersRound,
    Land: Landmark,
    Crop: FileText,
    Structure: Database,
    Tree: LayoutDashboard,
    Tenant: UsersRound,
    Business: Wallet,
    Worker: UserRound,
    Gps: MapPin,
  };
  return icons[icon];
}

function toDetail(e: unknown, fallback: string): { message: string; code?: string; fields?: [string, string[]][] } {
  if (e instanceof Error) {
    const api = e as ApiError;
    const raw = api.errors;
    let fields: [string, string[]][] | undefined;
    if (raw && typeof raw === 'object') {
      fields = Object.entries(raw as Record<string, unknown>)
        .filter(([, v]) => Array.isArray(v))
        .map(([k, v]) => [k, v as string[]]);
      if (fields.length === 0) fields = undefined;
    }
    return { message: api.message || fallback, code: api.code, fields };
  }
  if (typeof e === 'string' && e) return { message: e };
  return { message: fallback };

export function EPImportTablePage() {
  const { user } = useAuth();
  const { project } = useProject();
  const [tables, setTables] = useState<TableState[]>([]);
  const [uploadingTable, setUploadingTable] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; code?: string; fields?: [string, string[]][] } | null>(null);
  const [clearingTable, setClearingTable] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(user?.roles?.includes('ADMIN') ?? false);
  }, [user]);

  if (!isAdmin) {
    return (
      <PageLayout title="EP Data Import" subtitle="Admin only">
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-700">
          This page is available only to users with the <strong>ADMIN</strong> role.
        </div>
      </PageLayout>
    );
  }

  if (!project) {
    return <Navigate to="/projects" replace />;
  }

  const projectId = project.project_id;

  // Refresh counts on project change
  useEffect(() => {
    refreshAllCounts();
  }, [projectId]);

  // Initialize table states

  // Helper to render table card
  function TableCard(table: ImportTable, state: TableState) {
    const Icon = tableIcon(table.icon);
    const hasErrors = state.errors.length > 0;

    return (
      <div
        key={table.key}
        className={`rounded-xl border p-4 transition-shadow ${
          state.status === 'completed'
            ? 'border-green-200 bg-green-50/50'
            : state.status === 'uploading'
            ? 'border-yellow-200 bg-yellow-50/50'
            : state.status === 'error'
            ? 'border-red-200 bg-red-50/50'
            : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Icon className="text-blue-600" size={22} />
            <div>
              <h3 className="font-semibold text-gray-900">{table.label}</h3>
              <p className="text-xs text-gray-500">{table.en}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {state.status === 'completed' && (
              <button

        {state.status === 'pending' && (
          <label
            className="mt-3 block w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
          >
            <input
              id={`upload-input-${table.key}`}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setError(null);
                  void handleUpload(table.key);
                }
              }}
            />
            <Upload className="mx-auto mb-1 text-gray-400" size={18} />
            <span className="text-xs text-gray-600">Select .xlsx file to upload</span>
          </label>
        )}

        {(state.status === 'completed' || state.status === 'error') && (
          <>
            <button
              onClick={() => {
                const input = document.getElementById(`upload-input-${table.key}`) as HTMLInputElement;
                input?.click();
              }}
              className="mt-2 w-full rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              Upload again (fix errors then retry)
            </button>
            <button
              onClick={() => handleDelete(table.key)}
              className="mt-1 w-full rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Clear all drafts
            </button>
          </>
        )}
      </div>
    );
  }

                onClick={() => handleDelete(table.key)}
                className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded p-1"
                title="Delete all DRAFT data for this table"
              >
                <Trash2 size={16} />
              </button>
            )}
            {state.status === 'error' && (
              <button
                onClick={() => handleDelete(table.key)}
                className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded p-1"
                title="Delete all DRAFT data for this table"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {state.status === 'uploading' && (
          <div className="mb-2">
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full rounded-full bg-blue-600 animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm mb-3">
          {state.status === 'pending' && <span className="text-gray-500">Not uploaded</span>}
          {state.status === 'completed' && (
            <>
              <span className="text-green-700 font-medium">Imported {state.imported} of {state.total}</span>
              {state.skipped > 0 && <span className="text-yellow-700">• Skipped {state.skipped}</span>}
            </>
          )}
          {state.status === 'uploading' && <span className="text-yellow-700">Uploading…</span>}
          {state.status === 'error' && <span className="text-red-700 font-medium">{state.lastError}</span>}
        </div>

        {hasErrors && (
          <div className="mt-3 border border-red-200 rounded-lg bg-red-50/30">
            <div className="px-3 py-2 bg-red-100/50 rounded-t-lg">
              <p className="text-xs font-semibold text-red-800">
                {state.errors.length} error{state.errors.length > 1 ? 's' : ''} found:
              </p>
            </div>
            <ul className="max-h-32 overflow-y-auto">
              {state.errors.slice(0, 5).map((err, i) => (
                <li
                  key={i}
                  className="px-3 py-2 border-b border-red-100 text-xs hover:bg-red-100/50 cursor-pointer"
                  onClick={() => {
                    // Open error details modal
                    console.log('Edit row', err);
                  }}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="text-red-600 mt-0.5 shrink-0" size={12} />
                    <div>
                      <p className="font-medium text-red-800">Row {err.row}: {err.name}</p>
                      <ul className="mt-1 text-xs text-red-700">
                        {Object.entries(err.errors).map(([field, messages]) => (
                          <li key={field} className="ml-2 flex items-start gap-1">
                            <span>• {field}:</span>
                            <span>{messages.join(', ')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              ))}
              {state.errors.length > 5 && (
                <li className="px-3 py-2 text-xs text-gray-500">
                  + {state.errors.length - 5} more errors
                </li>
              )}
            </ul>
            {state.errors.length > 5 && (
              <button
                className="w-full mt-2 text-xs text-blue-600 hover:text-blue-800"
                onClick={() => {}}
              >
                View all {state.errors.length} errors
              </button>
            )}
          </div>
        )}

  useEffect(() => {
    const initial: TableState[] = IMPORT_TABLES.map(t => ({
      table: t,
      status: 'pending',
      total: 0,
      imported: 0,
      skipped: 0,
      errors: [],
      message: null,
      lastError: null,
    }));
    setTables(initial);
  }, []);


  async function handleUpload(tableKey: string) {
    const file = document.getElementById(`upload-input-${tableKey}`) as HTMLInputElement | null;
    if (!file?.files?.[0]) {
      setError({ message: 'Please select an .xlsx file first.' });
      return;
    }

    const table = IMPORT_TABLES.find(t => t.key === tableKey);
    if (!table) return;

    setTables(prev => prev.map(t => t.table.key === tableKey ? { ...t, status: 'uploading', errors: [], message: null, lastError: null } : t));
    setUploadingTable(tableKey);
    setError(null);

    try {
      let offset = 0;
      let done = false;
      let lastResult: EpStepImportResult | null = null;

      while (!done) {
        const result = await importEpStep(file.files[0], projectId, tableKey, offset, 50);
        offset = result.next_offset ?? offset;
        done = result.done;
        lastResult = result;
      }

      if (lastResult) {
        setTables(prev => prev.map(t => t.table.key === tableKey ? {
          ...t,
          status: 'completed',
          total: lastResult.total_rows,
          imported: lastResult.imported,
          skipped: lastResult.skipped,
          errors: lastResult.errors,
          message: `Imported ${lastResult.imported}, skipped ${lastResult.skipped}`,
          lastError: null,
        } : t));
      }
    } catch (e) {
      const detail = toDetail(e, 'Upload failed. Please try again.');
      setTables(prev => prev.map(t => t.table.key === tableKey ? { ...t, status: 'error', errors: [], lastError: detail.message } : t));
      setError(detail);
    } finally {
      setUploadingTable(null);
    }
  }

  async function handleDelete(tableKey: string) {
    const table = IMPORT_TABLES.find(t => t.key === tableKey);
    if (!table) return;
    if (!confirm(`Delete all draft DRAFT data for "${table.label}"? This cannot be undone.`)) {
      return;
    }
    setClearingTable(tableKey);
    setError(null);
    try {
      const { deleted } = await clearEpStep(tableKey, projectId);
      setTables(prev => prev.map(t => t.table.key === tableKey ? {
        ...t,
        status: 'pending',
        total: 0,
        imported: 0,
        skipped: 0,
        errors: [],
        message: null,
        lastError: null,

  return (
    <PageLayout
      title="EP Data Import"
      subtitle="Upload one table at a time — see errors, edit rows, and clear drafts"
    >
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="text-blue-600" size={20} />
          <h2 className="text-xl font-bold text-gray-900">EP Data Import</h2>
        </div>
        <p className="text-sm text-gray-600">
          Upload one table at a time. Table status is shown below.
          Click any error to see details, or use <strong>Delete</strong> to remove drafts.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-semibold text-red-800">{error.message}</p>
              {error.fields && error.fields.length > 0 && (
                <div className="mt-2 max-h-24 overflow-y-auto text-xs text-red-700">
                  <p className="font-semibold mb-1">Fields:</p>
                  {error.fields.map(([field, messages]) => (
                    <div key={field} className="mb-1">
                      <span className="font-medium">{field}:</span>
                      <span className="text-red-600"> {messages.join(', ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {IMPORT_TABLES.map(table => {
          const state = tables.find(t => t.table.key === table.key)!;
          return <TableCard key={table.key} table={table} state={state} />;
        })}
      </div>

      {/* Hidden file inputs for each table */}
      {IMPORT_TABLES.map(table => (
        <input
          key={table.key}
          id={`upload-input-${table.key}`}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              setError(null);
              void handleUpload(table.key);
            }
          }}
        />
      ))}

      {/* Footer */}
      <div className="mt-4 text-xs text-gray-400 text-center">
        Imported data is saved as DRAFT. Use "Clear all drafts" to remove any uploaded data.
      </div>
    </PageLayout>
  );
}

      } : t));
    } catch (e) {
      setError(toDetail(e, 'Failed to delete drafts.'));
    } finally {
      setClearingTable(null);
    }
  }

  const refreshAllCounts = async () => {
    const updated = await Promise.all(
      IMPORT_TABLES.map(async (t) => {
        try {
          const { count } = await countEpStep(t.key, projectId);
          return { table: t, count: count as number };
        } catch {
          return { table: t, count: 0 };
        }
      }),
    );
    const countMap = Object.fromEntries(updated.map(u => [u.table.key, u.count]));
    setTables(prev => prev.map(t => ({ ...t, total: countMap[t.table.key] ?? 0 })));
  };

}
