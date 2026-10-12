// ═══════════════════════════════════════════════════════════════
// EpicadPage — EPICAD: look up an EP by EP ID and generate the card
//
// Flow: enter EP ID number → matched EP is shown → Generate →
//       identification card rendered from database data
// Routes: /epicad (standalone tab) and /ep/:id/epicad (pre-selected)
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchEpFileData, getEp, lookupEps } from '../../api/ep';
import type { AffectedPerson, EpFileData, Tenant, Worker } from '../../types/ep';
import { PageLayout } from '../../components/PageLayout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { StatusBadge } from '../../components/StatusBadge';
import { DocumentPage } from '../../components/documents/DocumentPage';
import { EpicadTemplateDoc } from '../../components/epicad/EpicadTemplateDoc';
import { DEFAULT_EPICAD_TEMPLATE } from '../../components/epicad/defaultEpicadTemplate';
import { listEpicadDesigns } from '../../api/epicadDesign';
import { useProject } from '../../contexts/ProjectContext';
import type { CardSubject } from '../../components/epicad/epicadValues';

type CardKind = 'ep' | 'tenant' | 'worker';

type GeoRelation = { district_id?: number; name: string } | string | null | undefined;

function workerGeo(w: Worker, key: 'district' | 'upazila'): string {
  const flat = key === 'district' ? w.district_name : w.upazila_name;
  if (flat) return flat;
  const rel = (w as unknown as Record<string, GeoRelation>)[key];
  if (rel && typeof rel === 'object' && rel.name) return rel.name;
  return '';
}

export function EpicadPage() {
  const { id } = useParams<{ id: string }>();
  const presetId = id && /^\d+$/.test(id) ? Number(id) : null;
  const { project } = useProject();
  const projectId = project?.project_id;

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState<AffectedPerson | null>(null);
  const [generated, setGenerated] = useState(false);
  const [cardKind, setCardKind] = useState<CardKind>('ep');
  const [subject, setSubject] = useState<CardSubject | null>(null);
  const [autoSubjectId, setAutoSubjectId] = useState<number | null>(null);

  // Active EPICAD design for this project (falls back to default template)
  const { data: designs = [] } = useQuery({
    queryKey: ['epicad-designs', projectId],
    queryFn: () => listEpicadDesigns(projectId),
    enabled: !!projectId,
  });
  const activeDesign = designs.find((d) => d.is_active) ?? null;
  const template = activeDesign?.html_template || DEFAULT_EPICAD_TEMPLATE;

  // Debounce the EP ID input for live matching
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Pre-select the EP when opened from /ep/:id/epicad
  const {
    data: presetEp,
    isLoading: presetLoading,
    error: presetError,
  } = useQuery({
    queryKey: ['ep', presetId],
    queryFn: () => getEp(presetId as number),
    enabled: !!presetId,
  });

  useEffect(() => {
    if (presetEp && !selected) {
      setSelected(presetEp);
      setQuery(presetEp.ep_id ?? '');
    }
  }, [presetEp, selected]);

  // Live lookup of matching EP IDs
  const {
    data: results,
    isLoading: lookupLoading,
  } = useQuery({
    queryKey: ['ep-lookup', project?.project_id, debounced],
    queryFn: () => lookupEps(debounced, 20, project?.project_id),
    enabled: debounced.length > 0,
  });

  // Card data (from database) for the selected EP
  const {
    data: fileData,
    isLoading: cardLoading,
    error: cardError,
  } = useQuery({
    queryKey: ['ep-file-data', selected?.affected_person_id],
    queryFn: () => fetchEpFileData((selected as AffectedPerson).affected_person_id),
    enabled: !!selected,
  });

  const matches = results ?? [];
  const showResults = debounced.length > 0 && !selected;
  const doneMatching = !lookupLoading && matches.length === 0;

  // Tenant / wage-labour lists come from the same EP file data payload.
  const fileCast = fileData ? (fileData as unknown as EpFileData) : null;
  const tenants = fileCast?.tenants ?? [];
  const workers = fileCast?.workers ?? [];

  const subjectReady = cardKind === 'ep' || !!subject;

  function handleQueryChange(value: string) {
    setQuery(value);
    if (selected && value !== (selected.ep_id ?? '')) {
      setSelected(null);
      setGenerated(false);
      setSubject(null);
      setCardKind('ep');
      setAutoSubjectId(null);
    }
  }

  function runSearch() {
    setDebounced(query.trim());
  }

  function pick(ep: AffectedPerson) {
    setSelected(ep);
    setQuery(ep.ep_id ?? '');
    setGenerated(false);
    setSubject(null);
    setCardKind(ep.card_kind ?? 'ep');
    // When the lookup matched a Tenant / Wage Labour ID, auto-select that
    // person's card once the file data arrives.
    setAutoSubjectId(ep.card_kind !== 'ep' && ep.card_kind ? ep.card_subject_id ?? null : null);
  }

  // Auto-select the tenant/worker subject when pick() was driven by a
  // Tenant / Wage Labour EP ID in the lookup box.
  useEffect(() => {
    if (autoSubjectId == null || !fileCast) return;
    const list = cardKind === 'tenant' ? fileCast.tenants ?? [] : cardKind === 'worker' ? fileCast.workers ?? [] : [];
    const found = list.find((p) => cardKind === 'tenant'
      ? (p as Tenant).tenant_id === autoSubjectId
      : (p as Worker).worker_id === autoSubjectId);
    if (found) {
      setSubject(found as unknown as CardSubject);
      setAutoSubjectId(null);
    }
  }, [fileCast, autoSubjectId, cardKind]);

  function handleGenerate() {
    if (!selected) return;
    setGenerated(true);
  }

  function chooseKind(kind: CardKind) {
    setCardKind(kind);
    setSubject(null);
    setAutoSubjectId(null);
  }

  if (presetLoading) return <LoadingSpinner message="Loading EP..." />;
  if (presetError) {
    return <ErrorDisplay message={presetError instanceof Error ? presetError.message : 'Failed to load EP.'} />;
  }

  return (
    <PageLayout
      title="EPICAD"
      subtitle="Enter the EP ID number, confirm the matched Entitled Person, then Generate the EP Identification Card."
      actions={
        <span className="inline-flex items-center gap-2">
          <Link
            to="/epicad/design"
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            🎨 Design this card
          </Link>
          {selected && (
            <Link
              to={`/ep/${selected.affected_person_id}`}
              className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              ← Open EP {selected.ep_id}
            </Link>
          )}
        </span>
      }
    >
      {/* ── Step 1: EP ID lookup ──────────────────────────────── */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <label htmlFor="epicad-epid" className="mb-1.5 block text-sm font-semibold text-gray-800">
          Enter EP ID Number
        </label>
        <div className="flex gap-2">
          <input
            id="epicad-epid"
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="e.g. 0101TITLERESIDENTIAL#0001"
            autoFocus
            className="w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={runSearch}
            disabled={!query.trim()}
            className="shrink-0 rounded bg-gray-800 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40"
          >
            Search
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          Type at least one character — matching EP IDs appear as you type.
        </p>

        {/* Matched EP list */}
        {showResults && (
          <div className="mt-4 space-y-2">
            {lookupLoading && <LoadingSpinner message="Searching EP..." />}
            {!lookupLoading && matches.length > 0 && (
              <>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Matched EP{matches.length > 1 ? 's' : ''}
                </p>
                {matches.map((ep) => (
                  <button
                    key={ep.affected_person_id}
                    onClick={() => pick(ep)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left hover:border-blue-400 hover:bg-blue-50"
                  >
                    <span className="min-w-0">
                      <span className="block">
                        <span className="font-mono text-sm font-semibold text-blue-700">
                          {ep.ep_id ?? `#${ep.affected_person_id}`}
                        </span>
                        {ep.card_kind && ep.card_kind !== 'ep' && ep.card_subject_ep_id && (
                          <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-violet-700">
                            {ep.card_kind === 'tenant' ? 'Tenant' : 'Wage Labour'} {ep.card_subject_ep_id}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-gray-600">
                        {ep.name} · {ep.district ?? '—'}
                        {ep.mouza ? ` · ${ep.mouza}` : ''} · {ep.mobile || ''}
                      </span>
                    </span>
                    <span className="shrink-0">
                      <StatusBadge status={ep.status} />
                    </span>
                  </button>
                ))}
              </>
            )}
            {!lookupLoading && doneMatching && (
              <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No EP matched “{debounced}”. Check the EP ID number and try again.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Step 2: matched EP + Generate ─────────────────────── */}
      {selected && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">👤 Matched Entitled Person</h2>
            <span className="font-mono text-sm font-semibold text-blue-700">{selected.ep_id}</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-3">
            <InfoItem label="Name" value={selected.name} />
            <InfoItem label="Father/Husband" value={selected.father_name} />
            <InfoItem label="NID" value={selected.nid_number} />
            <InfoItem label="Sex" value={selected.gender} />
            <InfoItem label="Occupation" value={selected.occupation} />
            <InfoItem label="Mobile" value={selected.mobile} />
            <InfoItem label="District" value={selected.district} />
            <InfoItem label="Upazila" value={selected.upazila} />
            <InfoItem label="Land Status" value={selected.land_status} />
          </dl>

          {/* ── Card type ─────────────────────────────────────── */}
          <div className="mt-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Generate card for
            </p>
            <div className="flex flex-wrap gap-2">
              <KindTab
                active={cardKind === 'ep'}
                onClick={() => chooseKind('ep')}
                label="👤 Entitled Person"
              />
              <KindTab
                active={cardKind === 'tenant'}
                onClick={() => chooseKind('tenant')}
                label="🏠 Tenant"
                count={fileCast ? tenants.length : null}
              />
              <KindTab
                active={cardKind === 'worker'}
                onClick={() => chooseKind('worker')}
                label="🧑‍🏭 Wage Labour"
                count={fileCast ? workers.length : null}
              />
            </div>
          </div>

          {/* ── Tenant / Wage Labour picker ───────────────────── */}
          {cardKind !== 'ep' && (
            <div className="mt-4">
              {cardLoading && <LoadingSpinner message="Loading card data..." />}
              {!cardLoading && fileCast && (cardKind === 'tenant' ? tenants : workers).length === 0 && (
                <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  No {cardKind === 'tenant' ? 'tenants' : 'wage labour workers'} recorded for this EP yet.
                </p>
              )}
              {!cardLoading && fileCast && (cardKind === 'tenant' ? tenants : workers).length > 0 && (
                <ul className="space-y-2">
                  {(cardKind === 'tenant' ? tenants : workers).map((p) => (
                    <li key={cardKind === 'tenant' ? (p as Tenant).tenant_id : (p as Worker).worker_id}>
                      <button
                        type="button"
                        onClick={() => { setSubject(p as unknown as CardSubject); setAutoSubjectId(null); }}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                          subject === (p as unknown as CardSubject)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block font-mono text-xs font-semibold text-blue-700">
                            {(p as Tenant | Worker).ep_id ?? `#${cardKind === 'tenant' ? (p as Tenant).tenant_id : (p as Worker).worker_id}`}
                          </span>
                          <span className="block truncate text-sm font-medium text-gray-800">{p.name}</span>
                          <span className="block truncate text-xs text-gray-600">
                            {p.father_name ? `Father/Husband: ${p.father_name} · ` : ''}
                            {p.nid_number ? `NID: ${p.nid_number} · ` : ''}
                            {p.mobile ? `Mobile: ${p.mobile}` : ''}
                          </span>
                          {cardKind === 'tenant' && (p as Tenant).mouza && (
                            <span className="block truncate text-xs text-gray-500">
                              {[(p as Tenant).mouza, (p as Tenant).union_name]
                                .filter(Boolean)
                                .join(' · ')}
                              {(p as Tenant).address ? ` · ${(p as Tenant).address}` : ''}
                            </span>
                          )}
                          {cardKind === 'worker' && (p as Worker).mouza && (
                            <span className="block truncate text-xs text-gray-500">
                              {[(p as Worker).mouza, (p as Worker).union_name,
                                workerGeo(p as Worker, 'upazila'), workerGeo(p as Worker, 'district')]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={cardLoading || !subjectReady}
            className="mt-5 rounded bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            ⚡ Generate {cardKind === 'tenant' ? 'Tenant EP ' : cardKind === 'worker' ? 'Wage Labour EP ' : ''}EPICAD
          </button>
        </div>
      )}

      {/* ── Step 3: generated card ────────────────────────────── */}
      {generated && cardLoading && <LoadingSpinner message="Generating EPICAD from database..." />}
      {generated && cardError && (
        <ErrorDisplay
          message={cardError instanceof Error ? cardError.message : 'Failed to load EP card data.'}
        />
      )}
      {generated && subjectReady && !cardLoading && fileData && (
        <DocumentPage
          title={`EPICAD — ${cardKind === 'tenant' || cardKind === 'worker' ? (subject as CardSubject | null)?.name ?? '' : ((fileData as unknown as EpFileData).ep_id ?? selected?.name ?? '')}${cardKind !== 'ep' ? ` (${cardKind === 'tenant' ? 'Tenant' : 'Wage Labour'})` : ''}`}
          orientation="landscape"
          className="epicad-sheet"
        >
          <EpicadTemplateDoc
            template={template}
            data={fileData as unknown as EpFileData}
            subject={cardKind === 'ep' ? null : subject}
          />
        </DocumentPage>
      )}

      {!selected && !generated && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          Type an EP ID above (e.g. 0101TITLERESIDENTIAL#0001), select the matched EP, then choose a card
          type (Entitled Person, Tenant, or Wage Labour) and click{' '}
          <span className="font-medium text-gray-700">Generate EPICAD</span>. The card is produced from the
          database and can be printed or saved as PDF.
        </div>
      )}
    </PageLayout>
  );
}

// ── Helper component ─────────────────────────────────────────
function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <dt className="font-medium text-gray-600">{label}</dt>
      <dd className="text-gray-900">{value || '—'}</dd>
    </>
  );
}

// ── Card type tab ────────────────────────────────────────────
function KindTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-xs ${
            active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {count ?? '…'}
        </span>
      )}
    </button>
  );
}