// ═══════════════════════════════════════════════════════════════
// ECFileGeneratorPage — Entitlement Card (EC) generator
// Enter an EP ID → generate the official Entitlement Card (EC)
// document (A4 landscape, matching the reference format).
// ═══════════════════════════════════════════════════════════════

import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {lookupEps, fetchEpFileData} from '../../api/ep';
import {useProject} from '../../contexts/ProjectContext';
import {PageLayout} from '../../components/PageLayout';
import {LoadingSpinner} from '../../components/LoadingSpinner';
import {ErrorDisplay} from '../../components/ErrorDisplay';
import {ECFileDWASADocument} from '../../components/documents/ECFileDWASADocument';
import type {AffectedPerson, EpFileData, Tenant, Worker} from '../../types/ep';

export function ECFileGeneratorPage() {
    const {project} = useProject();
    const [input, setInput] = useState('');
    const [selected, setSelected] = useState<AffectedPerson | null>(null);
    const [dismissed, setDismissed] = useState(false);

    const query = input.trim();
    const {data: matches = [], isLoading: searching, isFetched: searched} = useQuery({
        queryKey: ['ec-file-lookup', project?.project_id, query],
        queryFn: () => lookupEps(query, 20, project?.project_id),
        enabled: query.length >= 2,
        staleTime: 30_000,
    });

    const fileQuery = useQuery({
        queryKey: ['ec-file-data', selected?.affected_person_id],
        queryFn: () => fetchEpFileData(selected!.affected_person_id),
        enabled: !!selected,
        staleTime: Infinity,
    });

    const fileData = fileQuery.data as EpFileData | undefined;

    // A Tenant EP ID in the lookup box is tagged card_kind="tenant" by the API;
    // resolve the actual tenant record so the EC card is built from the
    // tenant's own information (and only the SGfT head is populated).
    const tenant: Tenant | null = (() => {
        if (!selected || selected.card_kind !== 'tenant' || selected.card_subject_id == null) return null;
        return (fileData?.tenants ?? []).find((t) => t.tenant_id === selected.card_subject_id) ?? null;
    })();
    // Same for a Wage Labour EP ID (card_kind="worker") → build the card from
    // the worker record (only the GfWL head is populated).
    const worker: Worker | null = (() => {
        if (!selected || selected.card_kind !== 'worker' || selected.card_subject_id == null) return null;
        return (fileData?.workers ?? []).find((w) => w.worker_id === selected.card_subject_id) ?? null;
    })();
    // If a Tenant / Wage Labour card is picked but its subject record cannot
    // be resolved from the EP file data, never silently fall back to the main EP.
    const isTenantCard = selected?.card_kind === 'tenant';
    const isWorkerCard = selected?.card_kind === 'worker';
    const tenantCardResolved = !isTenantCard || tenant !== null;
    const workerCardResolved = !isWorkerCard || worker !== null;

    const pick = (m: AffectedPerson) => {
        setSelected(m);
        setInput(m.card_subject_ep_id ?? m.ep_id ?? m.name);
    };

    if (fileQuery.isLoading) {
        return <LoadingSpinner
            message={`Generating EC File for ${selected?.card_subject_ep_id ?? selected?.ep_id ?? selected?.name}...`}/>;
    }

    if (fileQuery.error) {
        return (
            <PageLayout
                title="EC File Generator"
                subtitle="Generate the official Entitlement Card (EC) (A4 landscape) from an EP ID."
            >
                <ErrorDisplay
                    message={fileQuery.error instanceof Error ? fileQuery.error.message : 'Failed to generate EC File'}
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

    if ((isTenantCard && !tenantCardResolved) || (isWorkerCard && !workerCardResolved)) {
        const subjectLabel = isWorkerCard ? 'wage labour' : 'tenant';
        return (
            <PageLayout
                title="EC File Generator"
                subtitle="Generate the official Entitlement Card (EC) (A4 landscape) from an EP ID."
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
              EC File — <span className="font-mono">{worker?.ep_id ?? tenant?.ep_id ?? fileData.ep_id ?? fileData.name}</span>
            </span>
                    </div>
                    <span className="text-xs text-gray-500">
            Use "Print / Save PDF" in the toolbar to download an A4 landscape PDF.
          </span>
                </div>
                <ECFileDWASADocument data={fileData} projectName={project?.name} tenant={tenant} worker={worker}/>
            </div>
        );
    }

    return (
        <PageLayout
            title="EC File Generator"
            subtitle="Generate the official Entitlement Card (EC) (A4 landscape) from an EP ID."
        >
            <div className="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <label htmlFor="ep-id" className="mb-1 block text-sm font-semibold text-gray-800">
                    EP ID
                </label>
                <p className="mb-3 text-xs text-gray-500">
                    Type the EP ID (e.g. <span className="font-mono">3030317#0002</span>), name or NID to search, then
                    select an
                    EP and click Generate EC File.
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
                                    const isSubject = m.card_kind === 'tenant' || m.card_kind === 'worker';
                                    return (
                                        <button
                                            key={m.affected_person_id}
                                            type="button"
                                            onClick={() => pick(m)}
                                            className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50"
                                        >
                    <span className="truncate">
                      <span className="font-mono font-medium text-blue-700">{isSubject ? (m.card_subject_ep_id ?? m.ep_id) : m.ep_id}</span>
                      <span className="ml-2 text-gray-800">{isSubject ? (m.card_subject_name ?? m.name) : m.name}</span>
                    </span>
                                            <span className="shrink-0 text-xs text-gray-400">
                      {m.card_kind === 'tenant' ? `Tenant of ${m.name}` : (m.card_kind === 'worker' ? `Wage Labour of ${m.name}` : `NID ${m.nid_number || '—'}`)}
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
                        Generate EC File
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
                    The generated card follows the official reference format — EP's Personal Information and the 18
                    compensation heads (Compensation / DC Amount / Previous Payment / Net Payable). Printed in A4
                    landscape with a "Print / Save PDF" toolbar.
                </p>
            </div>
        </PageLayout>
    );
}