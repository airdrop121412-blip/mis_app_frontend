// ═══════════════════════════════════════════════════════════════
// EPFileGeneratorPage — EP File generator
// Enter an EP ID → generate the official DWASA EP File document
// (A4 landscape, matching the reference format).
// ═══════════════════════════════════════════════════════════════

import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {lookupEps, fetchEpFileData} from '../../api/ep';
import {useProject} from '../../contexts/ProjectContext';
import {PageLayout} from '../../components/PageLayout';
import {LoadingSpinner} from '../../components/LoadingSpinner';
import {ErrorDisplay} from '../../components/ErrorDisplay';
import {EPFileDWASADocument} from '../../components/documents/EPFileDWASADocument';
import type {AffectedPerson, EpFileData, Tenant, Worker} from '../../types/ep';

export function EPFileGeneratorPage() {
    const {project} = useProject();
    const [input, setInput] = useState('');
    const [selected, setSelected] = useState<AffectedPerson | null>(null);
    const [dismissed, setDismissed] = useState(false);

    const query = input.trim();
    const {data: matches = [], isLoading: searching, isFetched: searched} = useQuery({
        queryKey: ['ep-file-lookup', project?.project_id, query],
        queryFn: () => lookupEps(query, 20, project?.project_id),
        enabled: query.length >= 2,
        staleTime: 30_000,
    });

    const fileQuery = useQuery({
        queryKey: ['ep-file-data', selected?.affected_person_id],
        queryFn: () => fetchEpFileData(selected!.affected_person_id),
        enabled: !!selected,
        staleTime: Infinity,
    });

    const fileData = fileQuery.data as EpFileData | undefined;

    // A Tenant EP ID in the lookup box is tagged card_kind="tenant" by the API;
    // resolve the actual tenant record so the EP File is built from the tenant's
    // own information. Same for a Wage Labour EP (card_kind="worker").
    const tenant: Tenant | null = (() => {
        if (!selected || selected.card_kind !== 'tenant' || selected.card_subject_id == null) return null;
        return (fileData?.tenants ?? []).find((t) => t.tenant_id === selected.card_subject_id) ?? null;
    })();
    const worker: Worker | null = (() => {
        if (!selected || selected.card_kind !== 'worker' || selected.card_subject_id == null) return null;
        return (fileData?.workers ?? []).find((w) => w.worker_id === selected.card_subject_id) ?? null;
    })();
    // If a Tenant / Wage Labour card is picked but its subject record cannot be
    // resolved from the EP file data, never silently fall back to the main EP.
    const isIndirectCard = selected?.card_kind === 'tenant' || selected?.card_kind === 'worker';
    const indirectCardResolved = !isIndirectCard
        ? true
        : selected.card_kind === 'tenant'
            ? tenant !== null
            : worker !== null;

    const pick = (m: AffectedPerson) => {
        setSelected(m);
        setInput(m.card_subject_ep_id ?? m.ep_id ?? m.name);
    };

    if (fileQuery.isLoading) {
        return <LoadingSpinner
            message={`Generating EP File for ${selected?.card_subject_ep_id ?? selected?.ep_id ?? selected?.name}...`}/>;
    }

    if (fileQuery.error) {
        return (
            <PageLayout
                title="EP File Generator"
                subtitle="Generate the official DWASA EP File (A4 landscape) from an EP ID."
            >
                <ErrorDisplay
                    message={fileQuery.error instanceof Error ? fileQuery.error.message : 'Failed to generate EP File'}
                    onRetry={fileQuery.refetch}
                />
                <button
                    type="button"
                    onClick={() => {
                        setSelected(null);
                        setInput('');
                    }}
                    className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    ← Search another EP
                </button>
            </PageLayout>
        );
    }

    if (isIndirectCard && !indirectCardResolved) {
        const subjectLabel = selected.card_kind === 'tenant' ? 'tenant' : 'wage labour';
        return (
            <PageLayout
                title="EP File Generator"
                subtitle="Generate the official DWASA EP File (A4 landscape) from an EP ID."
            >
                <ErrorDisplay
                    message={`Could not find the ${subjectLabel} record linked to EP ID "${
                        selected.card_subject_ep_id ?? selected.ep_id
                    }".`}
                />
                <button
                    type="button"
                    onClick={() => {
                        setSelected(null);
                        setInput('');
                    }}
                    className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    ← Search another EP
                </button>
            </PageLayout>
        );
    }

    if (fileData && selected) {
        return (
            <div>
                <div
                    className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8 print:hidden">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setSelected(null);
                                setInput('');
                            }}
                            className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                        >
                            ← New EP
                        </button>
                        <span className="text-sm font-medium text-gray-700">
              EP File — <span className="font-mono">{worker?.ep_id ?? tenant?.ep_id ?? fileData.ep_id ?? fileData.name}</span>
            </span>
                    </div>
                    <span className="text-xs text-gray-500">
            Use "Print / Save PDF" in the toolbar to download an A4 landscape PDF.
          </span>
                </div>
                <EPFileDWASADocument data={fileData} projectName={project?.name} tenant={tenant} worker={worker}/>
            </div>
        );
    }

    return (
        <PageLayout
            title="EP File Generator"
            subtitle="Generate the official DWASA EP File (A4 landscape) from an EP ID."
        >
            <div className="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <label htmlFor="ep-id" className="mb-1 block text-sm font-semibold text-gray-800">
                    EP ID
                </label>
                <p className="mb-3 text-xs text-gray-500">
                    Type the EP ID (e.g. <span className="font-mono">3030317#0002</span>), name or NID to search, then
                    select an
                    EP and click Generate EP File.
                </p>

                <div className="relative">
                    <input
                        id="ep-id"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            setSelected(null);
                            setDismissed(false);
                        }}
                        placeholder="Enter EP ID / Name / NID…"
                        autoComplete="off"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />

                    {!dismissed && query.length >= 2 && matches.length > 0 && (
                        <div
                            className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                            <div className="max-h-64 overflow-y-auto">
                                {matches.map((m) => {
                                    const isTenant = m.card_kind === 'tenant';
                                    const isWorker = m.card_kind === 'worker';
                                    const isSubject = isTenant || isWorker;
                                    const shownEpId = isSubject ? (m.card_subject_ep_id ?? m.ep_id) : m.ep_id;
                                    const shownName = isSubject ? (m.card_subject_name ?? m.name) : m.name;
                                    return (
                                        <button
                                            key={m.affected_person_id}
                                            type="button"
                                            onClick={() => pick(m)}
                                            className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50"
                                        >
                    <span className="truncate">
                      <span className="font-mono font-medium text-blue-700">{shownEpId ?? '—'}</span>
                      <span className="ml-2 text-gray-800">{shownName}</span>
                            {isTenant && (
                                <span
                                    className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-700">Tenant</span>
                            )}
                            {isWorker && (
                                <span
                                    className="ml-2 rounded bg-cyan-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-cyan-700">Wage Labour</span>
                            )}
                    </span>
                                            <span className="shrink-0 text-xs text-gray-400">
                          {isTenant ? `Tenant of ${m.name}` : (isWorker ? `Wage Labour of ${m.name}` : `NID ${m.nid_number || '—'}`)}
                    </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {!dismissed && query.length >= 2 && searched && !searching && matches.length === 0 && (
                        <div
                            className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-lg">
                            No EP found for "{query}".
                        </div>
                    )}
                </div>

                {searching && query.length >= 2 && <LoadingSpinner message="Searching…"/>}

                <div className="mt-4 flex items-center gap-3">
                    <button
                        type="button"
                        disabled={!selected}
                        onClick={() => fileQuery.refetch()}
                        className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Generate EP File
                    </button>
                    {selected && (
                        <span className="text-xs text-gray-600">
              Selected: <span className="font-mono font-medium">
                {selected.card_kind === 'tenant' || selected.card_kind === 'worker'
                    ? selected.card_subject_ep_id ?? selected.ep_id
                    : selected.ep_id}
              </span> — {selected.card_kind === 'tenant' || selected.card_kind === 'worker'
                    ? selected.card_subject_name ?? selected.name
                    : selected.name}
            </span>
                    )}
                </div>
            </div>

            <div className="mx-auto max-w-2xl">
                <p className="text-xs leading-relaxed text-gray-500">
                    The generated file follows the official DWASA format — EP's Personal Information, Land Information
                    (DC / PAVC rates), Structure Information, Tree Information and Previous Payment Information. Printed
                    in A4
                    landscape with a "Print / Save PDF" toolbar.
                </p>
            </div>
        </PageLayout>
    );
}