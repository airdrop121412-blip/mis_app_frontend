// ═══════════════════════════════════════════════════════
// EpDataImportWizardPage — Step-by-step EP Data Import
// Each step uploads one sheet of the .xlsx template (Step 1–10).
// ═══════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Download, Upload, FileSpreadsheet, Trash2 } from 'lucide-react';
import { PageLayout } from '../../components/PageLayout';
import { useAuth } from '../../hooks/useAuth';
import { useProject } from '../../contexts/ProjectContext';
import { downloadEpImportTemplate, importEpStep, clearEpStep, countEpStep, type EpStepImportResult, EP_IMPORT_STEPS } from '../../api/epImport';
import type { ApiError } from '../../api/client';

interface ErrorDetail {
  message: string;
  code?: string;
  fields?: [string, string[]][];
}

function toDetail(e: unknown, fallback: string): ErrorDetail {
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
}

export function EpDataImportWizardPage() {
  const { user } = useAuth();
  const { project } = useProject();
  const [currentStep, setCurrentStep] = useState(0);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [results, setResults] = useState<Record<string, EpStepImportResult | null>>({});
  const [uploading, setUploading] = useState(false);
  const [clearingStep, setClearingStep] = useState<string | null>(null);
  const [stepCounts, setStepCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<ErrorDetail | null>(null);

  const isAdmin = user?.roles?.includes('ADMIN') ?? false;

  if (!isAdmin) {
    return (
      <PageLayout title="EP Data Import (Step-by-Step)" subtitle="Admin only">
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
  const step = EP_IMPORT_STEPS[currentStep]!;
  const stepKey = step.key;
  const stepResult = results[stepKey] ?? null;
    const hasAttempted = stepResult !== null;

  const refreshStepCounts = async () => {
    try {
      const entries = await Promise.all(
        EP_IMPORT_STEPS.map(async (s) => {
          try {
            const { count } = await countEpStep(s.key, projectId);
            return [s.key, count] as const;
          } catch {
            return [s.key, 0] as const;
          }
        }),
      );
      setStepCounts(Object.fromEntries(entries));
    } catch {
      // Counts are best-effort — the wizard still works without them.
    }
  };

  // Best-effort: refresh per-step DRAFT counts so the operator can see
  // which tables hold data worth clearing before re-uploading.
  useEffect(() => {
    refreshStepCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const completedSteps = Object.entries(results).filter(
    ([, r]) => r !== null && r.imported > 0,
  ).length;

  async function handleDownloadTemplate() {
    try {
      const blob = await downloadEpImportTemplate();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'ep_import_template.xlsx';
      anchor.click();
      URL.revokeObjectURL(url);
      anchor.remove();
    } catch (e) {
      setError(toDetail(e, 'Failed to download the template.'));
    }
  }

  async function handleUpload() {
    const file = files[stepKey];
    if (!file) {
      setError({ message: 'Please select an .xlsx file first.' });
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const result = await importEpStep(file, projectId, stepKey);
      setResults((prev) => ({ ...prev, [stepKey]: result }));
      refreshStepCounts();
    } catch (e) {
      setError(toDetail(e, 'Upload failed. Please try again.'));
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
        setFiles((prev) => ({ ...prev, [stepKey]: f }));
    setError(null);
  }

  function nextStep() {
    setCurrentStep((s) => Math.min(s + 1, EP_IMPORT_STEPS.length - 1));
  }

  function prevStep() {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  function restart() {
    setCurrentStep(0);
    setFiles({});
    setResults({});
    setError(null);
  }

  /** Clear all DRAFT data for the current step and reset the UI state. */
  async function handleClearStep(targetKey?: string) {
    const key = targetKey ?? stepKey;
    if (!confirm(`Clear all ${EP_IMPORT_STEPS.find(s => s.key === key)?.en ?? key} data for this project? This cannot be undone.`)) {
      return;
    }
    setClearingStep(key);
    setError(null);
    try {
      await clearEpStep(key, projectId);
      // Reset state for this step so the user can re-upload.
      setFiles((prev) => ({ ...prev, [key]: null }));
      setResults((prev) => ({ ...prev, [key]: null }));
      refreshStepCounts();
    } catch (e) {
      setError(toDetail(e, 'Failed to clear table.'));
    } finally {
      setClearingStep(null);
    }
  }


  return (
    <PageLayout
      title="EP Data Import (Step-by-Step)"
      subtitle={`Table-by-table upload — Step ${currentStep + 1} of ${EP_IMPORT_STEPS.length}`}
      actions={
        <button type="button" className="btn btn-secondary" onClick={restart} style={{ fontSize: 12 }}>
          Restart Wizard
        </button>
      }
    >
      {/* -- Progress indicator -- */}
      <div className="mis-wizard-progress">
        {EP_IMPORT_STEPS.map((s, idx) => {
          const r = results[s.key];
          const done = r && r.imported > 0;
          const isCurrent = idx === currentStep;
          return (
            <button
              key={s.key}
              type="button"
              className={`mis-wizard-step ${done ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
              onClick={() => setCurrentStep(idx)}
            >
              <span className="mis-wizard-step-num">{done ? '\u2713' : idx + 1}</span>
              <span className="mis-wizard-step-label">{s.en}</span>
            </button>
          );
        })}
      </div>

      {/* -- Step card -- */}
      <div className="mis-wizard-card">
        <div className="mis-wizard-header">
          <h2>{step.label} <span className="mis-wizard-en">({step.en})</span></h2>
          <p className="mis-wizard-desc">{step.description}</p>
          {stepKey !== 'ep' && (
            <button
              type="button"
              className="mis-btn mis-btn-clear"
              onClick={() => handleClearStep()}
              disabled={clearingStep === stepKey || uploading}
              title={`Clear all ${step.en} data for this project and re-upload`}
            >
              {clearingStep === stepKey ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span className="mis-spinner" style={{ width: 12, height: 12 }} />
                  Clearing…
                </span>
              ) : (
                <>
                  <Trash2 size={16} />
                  Clear Table
                </>
              )}
            </button>
          )}
        </div>

        {/* File upload + template */}
        {!stepResult && (
          <>
            <div className="mis-upload-area">
              <label className="mis-file-input">
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                />
                <FileSpreadsheet className="mis-file-icon" size={20} />
                <span className="mis-file-label">
                  {files[stepKey]?.name ?? 'Choose .xlsx file for this table'}
                </span>
              </label>

              <div className="mis-wizard-actions">
                <button
                  type="button"
                  className="mis-btn mis-btn-secondary"
                  onClick={handleDownloadTemplate}
                  disabled={uploading}
                >
                  <Download size={16} />
                  Download Template
                </button>
                <button
                  type="button"
                  className="mis-btn mis-btn-primary"
                  onClick={handleUpload}
                  disabled={uploading || !files[stepKey]}
                >
                  {uploading ? (
                    <>
                      <div className="mis-spinner" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Upload & Validate
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Error display */}
        {error && (
          <div className="mis-wizard-error">
            <strong>{error.message}</strong>
            {error.fields && error.fields.length > 0 && (
              <ul style={{ marginTop: 6 }}>
                {error.fields.map(([field, msgs]) => (
                  <li key={field}>
                    <code>{field}</code>: {msgs.join('; ')}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Results display */}
        {stepResult && (
          <div className="mis-wizard-result">
            <div className="mis-wizard-summary">
              <span className="mis-summary-item">
                <strong>{stepResult.imported}</strong> / {stepResult.total} rows imported
              </span>
              {stepResult.skipped > 0 && (
                <span className="mis-summary-item error">
                  <strong>{stepResult.skipped}</strong> skipped
                </span>
              )}
            </div>

            {/* Visual progress bar */}
            {stepResult.total > 0 && (
              <div style={{ margin: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', marginBottom: 4 }}>
                  <span>{stepResult.imported} imported</span>
                  <span>{stepResult.skipped} skipped</span>
                </div>
                <div className="mis-progress-bar">
                  <div
                    className="mis-progress-fill mis-progress-imported"
                    style={{ width: `${(stepResult.imported / stepResult.total) * 100}%` }}
                  />
                  {stepResult.skipped > 0 && (
                    <div
                      className="mis-progress-fill mis-progress-skipped"
                      style={{ width: `${(stepResult.skipped / stepResult.total) * 100}%`, marginTop: 2 }}
                    />
                  )}
                </div>
              </div>
            )}

            {stepResult.missing_columns.length > 0 && (
              <p className="mis-wizard-warning">
                Missing columns: {stepResult.missing_columns.join(', ')}
              </p>
            )}

            {stepResult.errors.length > 0 && (
              <div className="mis-wizard-errors">
                <h4>Row Errors ({stepResult.errors.length})</h4>
                <table className="mis-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Name</th>
                      <th>Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stepResult.errors.map((err, i) => (
                      <tr key={i}>
                        <td>{err.row}</td>
                        <td>{err.name || '\u2014'}</td>
                        <td>
                          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                            {Object.entries(err.errors).map(([field, msgs]) => (
                              <li key={field}>
                                <code>{field}</code>: {msgs.join('; ')}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        {hasAttempted && !uploading && (
          <div className="mis-wizard-nav">
            <button
              type="button"
              className="mis-btn mis-btn-secondary"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              \u2190 Previous
            </button>
            {stepKey !== 'ep' && (
              <button
                type="button"
                className="mis-btn mis-btn-clear"
                onClick={() => handleClearStep()}
                disabled={clearingStep === stepKey || uploading}
              >
                {clearingStep === stepKey ? (
                  <>
                    <span className="mis-spinner" style={{ width: 12, height: 12 }} />
                    Clearing…
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Clear Table
                  </>
                )}
              </button>
            )}
            {currentStep < EP_IMPORT_STEPS.length - 1 ? (
              <button type="button" className="mis-btn mis-btn-primary" onClick={nextStep}>
                Next: {EP_IMPORT_STEPS[currentStep + 1]!.en} \u2192
              </button>
            ) : (
              <Link to="/" className="mis-btn mis-btn-primary">
                Done — Back to Dashboard
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Summary sidebar */}
      <div className="mis-wizard-sidebar">
        <h3>Import Progress</h3>
        <p style={{ fontSize: 13, color: '#657188', marginBottom: 12 }}>
          {completedSteps} of {EP_IMPORT_STEPS.length} tables completed
        </p>
        <div className="mis-wizard-sidebar-list">
          {EP_IMPORT_STEPS.map((s, idx) => {
            const r = results[s.key];
            const done = r && r.imported > 0;
            const attempted = r !== undefined && r !== null;
            const dbCount = stepCounts[s.key] ?? 0;
            return (
              <div
                key={s.key}
                className={`mis-sidebar-item ${done ? 'done' : ''} ${attempted && !done ? 'attempted' : ''}`}
                onClick={() => setCurrentStep(idx)}
              >
                <span className="mis-sidebar-num">{idx + 1}</span>
                <span className="mis-sidebar-label">{s.en}</span>
                {attempted && (
                  <span className="mis-sidebar-status">
                    {r!.imported}/{r!.total}
                  </span>
                )}
                {!attempted && dbCount > 0 && (
                  <span className="mis-sidebar-status" title="Existing DRAFT rows in database">
                    {dbCount} in DB
                  </span>
                )}
                {s.key !== 'ep' && (
                  <button
                    type="button"
                    className="mis-sidebar-clear"
                    onClick={(e) => { e.stopPropagation(); handleClearStep(s.key); }}
                    disabled={clearingStep === s.key}
                    title={`Clear all ${s.en} data`}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
}
