// ═══════════════════════════════════════════════════════════════
// EpicadDesignPage — design / customise the EPICAD card
//
// Lets the user:
//   • create a design (new design starts from the standard card layout)
//   • edit the HTML template directly (with {{field}} placeholders)
//   • upload a .html/.doc/.docx design (doc files are converted to HTML)
//   • preview with real EP data, save, and set active
// Route: /epicad/design
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listEpicadDesigns,
  createEpicadDesign,
  updateEpicadDesign,
  deleteEpicadDesign,
} from '../../api/epicadDesign';
import { DEFAULT_EPICAD_TEMPLATE } from '../../components/epicad/defaultEpicadTemplate';
import { EpicadTemplateDoc } from '../../components/epicad/EpicadTemplateDoc';
import { docToHtml } from '../../utils/docToHtml';
import { listPlaceholders } from '../../components/epicad/epicadValues';
import { useProject } from '../../contexts/ProjectContext';
import { PageLayout } from '../../components/PageLayout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import type { EpFileData } from '../../types/ep';

export function EpicadDesignPage() {
  const { project } = useProject();
  const projectId = project?.project_id;
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [template, setTemplate] = useState('');
  const [dirty, setDirty] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // ── Load designs for this project ───────────────────────────
  const {
    data: designs = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['epicad-designs', projectId],
    queryFn: () => listEpicadDesigns(projectId),
    enabled: !!projectId,
  });

  const selected = designs.find((d) => d.epicad_design_id === selectedId) ?? null;

  // Load the selected design's template into the editor.
  useEffect(() => {
    if (!selected) return;
    setName(selected.name ?? '');
    setTemplate(selected.html_template ?? '');
    setDirty(false);
  }, [selected?.epicad_design_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutations ───────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (tpl: string) =>
      createEpicadDesign({
        project_id: projectId as number,
        name: 'New design',
        orientation: 'landscape',
        page_size: 'A4',
        html_template: tpl,
        is_active: designs.length === 0,
      }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['epicad-designs', projectId] });
      setSelectedId(d.epicad_design_id);
      setName(d.name ?? '');
      setTemplate(d.html_template ?? '');
      setDirty(false);
    },
  });

  const saveMut = useMutation({
    mutationFn: () =>
      updateEpicadDesign(selectedId as number, {
        name,
        html_template: template,
      }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['epicad-designs', projectId] });
      setSelectedId(d.epicad_design_id);
      setDirty(false);
    },
  });

  const activateMut = useMutation({
    mutationFn: () => updateEpicadDesign(selectedId as number, { is_active: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['epicad-designs', projectId] }),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteEpicadDesign(selectedId as number),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epicad-designs', projectId] });
      setSelectedId(null);
      setDirty(false);
    },
  });

  // ── Handlers ────────────────────────────────────────────────
  function handleCreate() {
    if (!projectId) return;
    createMut.mutate(DEFAULT_EPICAD_TEMPLATE);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setUploadError('');
    if (!file || !selected) return;
    try {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (ext === 'html' || ext === 'htm') {
        setTemplate(await file.text());
        setDirty(true);
      } else if (ext === 'doc' || ext === 'docx') {
        const { html, warnings } = await docToHtml(file);
        setTemplate(html);
        setDirty(true);
        if (warnings.length) setUploadError(warnings.join(' '));
      } else {
        setUploadError('Unsupported file. Use .html or .doc / .docx.');
      }
    } catch {
      setUploadError('Failed to read the uploaded file.');
    }
    e.target.value = '';
  }

  const placeholders = useMemo(
    () => (template ? listPlaceholders(template) : []),
    [template],
  );

  // ── States ──────────────────────────────────────────────────
  if (isLoading) return <LoadingSpinner message="Loading EPICAD designs..." />;
  if (error) return <ErrorDisplay message="Failed to load designs." />;

  return (
    <PageLayout
      title="EPICAD Designer"
      subtitle="Design the EPICAD card: edit the HTML layout or upload a .doc / .html template, then Generate in the EPICAD tab."
      actions={
        <Link
          to="/epicad"
          className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          ← Back to EPICAD
        </Link>
      }
    >
      {!projectId ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          Select a project first to manage EPICAD designs.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Design list ─────────────────────────────────── */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Designs</h2>
              <button
                onClick={handleCreate}
                disabled={createMut.isPending}
                className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                + New
              </button>
            </div>
            {designs.length === 0 ? (
              <p className="text-sm text-gray-500">No designs yet. Create one or upload a file.</p>
            ) : (
              <ul className="space-y-2">
                {designs.map((d) => (
                  <li key={d.epicad_design_id}>
                    <button
                      onClick={() => setSelectedId(d.epicad_design_id)}
                      className={`w-full rounded border px-3 py-2 text-left text-sm ${
                        selectedId === d.epicad_design_id
                          ? 'border-blue-500 bg-blue-50 text-blue-800'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium">{d.name || `Design ${d.epicad_design_id}`}</span>
                      {d.is_active && (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Active
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Editor ───────────────────────────────────────── */}
          <div className="space-y-4 lg:col-span-2">
            {!selected ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
                Select a design to edit, or create a new one.
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Design name"
                      className="w-56 rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => saveMut.mutate()}
                      disabled={!dirty || saveMut.isPending}
                      className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                    >
                      {saveMut.isPending ? 'Saving...' : '💾 Save'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Set this as the active EPICAD design?')) activateMut.mutate();
                      }}
                      disabled={selected.is_active || activateMut.isPending}
                      className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40"
                    >
                      ✓ Use this design
                    </button>
                    <label className="inline-flex cursor-pointer items-center rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      ⬆ Upload .doc / .html
                      <input type="file" accept=".html,.htm,.doc,.docx" onChange={handleUpload} className="hidden" />
                    </label>
                    <button
                      onClick={() => {
                        if (confirm('Delete this design?')) deleteMut.mutate();
                      }}
                      disabled={deleteMut.isPending}
                      className="rounded border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>

                  {(dirty || saveMut.isPending) && (
                    <p className={`mb-3 text-sm ${saveMut.isError ? 'text-red-600' : 'text-amber-600'}`}>
                      {saveMut.isError
                        ? `Save failed: ${saveMut.error instanceof Error ? saveMut.error.message : 'Unknown error'}`
                        : 'Unsaved changes'}
                    </p>
                  )}
                  {uploadError && <p className="mb-3 text-sm text-amber-700">{uploadError}</p>}

                  {placeholders.length > 0 && (
                    <div className="mb-3 rounded-md bg-gray-50 p-3">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                        Available placeholders (filled from database)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {placeholders.map((p) => (
                          <code key={p} className="rounded bg-white px-1.5 py-0.5 text-xs text-blue-700">
                            {'{{'}{p}{'}}'}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea
                    value={template}
                    onChange={(e) => {
                      setTemplate(e.target.value);
                      setDirty(true);
                    }}
                    spellCheck={false}
                    className="h-80 w-full rounded border border-gray-300 p-3 font-mono text-xs text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* ── Live preview with placeholder values ───── */}
                <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">Preview</h3>
                  <div className="overflow-auto rounded border border-gray-200">
                    <EpicadTemplateDoc template={template} data={SAMPLE_EP} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}

// ── Sample EP used for the designer live preview ──────────────
const SAMPLE_EP = {
  affected_person_id: 0,
  project_id: 0,
  ep_id: '৫১০০৫২#০০২৭',
  hh_id: null,
  name: 'মোঃ কামাল হোসেন',
  father_name: 'মোঃ আব্দুল জলিল',
  mother_name: 'মোছাঃ রাবেয়া খাতুন',
  spouse_name: null,
  nid_number: '৫১০০৫২০০২৭',
  mobile: '০১৮৯৪০৩২৩৫৫',
  gender_id: 0,
  gender: 'পুুরুষ',
  date_of_birth: '১৯৮৫-০৩-১০',
  age: 41,
  religion_id: null,
  religion: 'ইসলাম',
  occupation_id: null,
  occupation: 'মৎস্যজীবী',
  district_id: 0,
  district: 'বাগেরহাট',
  upazila_id: 0,
  upazila: 'মোড়েলগঞ্জ',
  mouza: 'নারিকেলবাড়িয়া',
  union_name: 'খালসাখালী',
  category_of_loss: 'কৃষি',
  ownership: null,
  land_status_id: 0,
  land_status: null,
  rc_type_id: 0,
  rc_type: null,
  monthly_income: '0.00',
  monthly_expense: '0.00',
  gps_latitude: null,
  gps_longitude: null,
  location_accuracy: null,
  location_source_id: null,
  is_household_head: true,
  total_family_member: 5,
  male_member: 3,
  female_member: 2,
  remarks: null,
  status: 'VERIFIED',
  lands: [
    {
      mouza: 'নারিকেলবাড়িয়া',
      dag_number: '১২৩',
      khatian_number: '৪৫',
      land_area: '0.2500',
    },
  ],
} as unknown as EpFileData;