import { Link } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { lookupEps, fetchEpFileData, listEps } from '../../api/ep';
import { listVouchers, fetchVoucher, createVoucher, approveVoucher, fetchAdditionalPending } from '../../api/voucher';
import { useCreateVoucher } from '../../hooks/useVoucher';
import { useProject } from '../../contexts/ProjectContext';
import { PageLayout } from '../../components/PageLayout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { VoucherDocument } from '../../components/documents/VoucherDocument';
import type { AffectedPerson, EpFileData, Tenant, Worker } from '../../types/ep';
import type { VoucherFullData, AdditionalPendingItem } from '../../types/voucher';

export function VoucherFileGeneratorPage() {
  const { project } = useProject();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState<AffectedPerson | null>(null);
  const [voucherId, setVoucherId] = useState<number | null>(null);
  const autoCreateAttempt = useRef<number | null>(null);
  const query = input.trim();
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [showAllVouchers, setShowAllVouchers] = useState(false);
  const [bulkDocuments, setBulkDocuments] = useState<Array<{
    ep: AffectedPerson;
    fileData: EpFileData;
    voucher: VoucherFullData;
  }>>([]);

  const lookup = useQuery({
    queryKey: ['voucher-file-lookup', project?.project_id, query],
    queryFn: () => lookupEps(query, 20, project?.project_id),
    enabled: query.length >= 2 && !selected,
    staleTime: 30_000,
  });
  const fileQuery = useQuery({
    queryKey: ['voucher-file-data', selected?.affected_person_id],
    queryFn: () => fetchEpFileData(selected!.affected_person_id),
    enabled: !!selected,
    staleTime: Infinity,
  });
  const approvedVouchersQuery = useQuery({
    queryKey: ['voucher-approved-ep-list', project?.project_id],
    queryFn: async () => {
      const result = await listEps({
        project_id: project?.project_id,
        per_page: 100,
      });
      const rows = await Promise.all(result.items
        .filter((ep) => ep.status === 'APPROVED' || ep.status === 'PAID')
        .map(async (ep) => ({
        ep,
        vouchers: await listVouchers(ep.affected_person_id),
        })));
      return rows;
    },
    enabled: true,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const vouchersQuery = useQuery({
    queryKey: ['voucher-file-list', selected?.affected_person_id],
    queryFn: () => listVouchers(selected!.affected_person_id),
    enabled: !!selected,
  });
  const currentVoucher = (vouchers: Awaited<ReturnType<typeof listVouchers>>) =>
    vouchers.find((voucher) => voucher.payment_status === 'PENDING' && !voucher.approved_by)
    ?? vouchers.find((voucher) => voucher.payment_status !== 'CANCELLED');
  const voucherQuery = useQuery({
    queryKey: ['voucher-file', selected?.affected_person_id, voucherId],
    queryFn: () => fetchVoucher(selected!.affected_person_id, voucherId!),
    enabled: !!selected?.affected_person_id && !!voucherId,
  });

  const fileData = fileQuery.data as EpFileData | undefined;
  const createMut = useCreateVoucher(selected?.affected_person_id ?? 0);
  const tenant: Tenant | null = selected?.card_kind === 'tenant' && selected.card_subject_id != null
    ? (fileData?.tenants ?? []).find((item) => item.tenant_id === selected.card_subject_id) ?? null
    : null;
  const worker: Worker | null = selected?.card_kind === 'worker' && selected.card_subject_id != null
    ? (fileData?.workers ?? []).find((item) => item.worker_id === selected.card_subject_id) ?? null
    : null;
  const approvedVoucherRows = approvedVouchersQuery.data ?? [];
  const [additionalSearch, setAdditionalSearch] = useState('');
  const additionalPendingQuery = useQuery({
    queryKey: ['additional-payment-pending', project?.project_id, additionalSearch.trim()],
    queryFn: () => fetchAdditionalPending({
      project_id: project?.project_id,
      q: additionalSearch.trim() || undefined,
    }),
    enabled: true,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const additionalPendingRows: AdditionalPendingItem[] = additionalPendingQuery.data ?? [];
  const activeApprovedVouchers = approvedVoucherRows.flatMap(({ ep, vouchers }) =>
    vouchers
      .filter((voucher) => voucher.payment_status !== 'CANCELLED')
      .map((voucher) => ({ ep, voucher })),
  );
  const pendingApprovedVouchers = activeApprovedVouchers.filter(({ voucher }) =>
    voucher.payment_status === 'PENDING' && !voucher.approved_by,
  );

  async function createAllApprovedVouchers() {
    setBulkBusy(true);
    setBulkError('');
    setBulkMessage('');
    try {
      const missing = approvedVoucherRows.filter(({ ep, vouchers }) =>
        ep.status === 'PAID'
          ? !vouchers.some((voucher) => voucher.payment_status === 'PENDING' && !voucher.approved_by)
          : !vouchers.some((voucher) => voucher.payment_status !== 'CANCELLED'),
      );
      const results = await Promise.allSettled(
        missing.map(({ ep }) => createVoucher(ep.affected_person_id)),
      );
      const created = results.filter((result) => result.status === 'fulfilled').length;
      const failures = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result) => result.reason instanceof Error ? result.reason.message : 'Unknown error');
      if (failures.length > 0) {
        setBulkError(`${failures.length} voucher${failures.length === 1 ? '' : 's'} failed: ${failures[0]}`);
      }
      setBulkMessage(`Created ${created} voucher${created === 1 ? '' : 's'} for approved EPs${missing.length === 0 ? ' (all already existed)' : '.'}`);
      const refreshed = await approvedVouchersQuery.refetch();
      await loadAllVoucherDocuments(refreshed.data ?? []);
      setShowAllVouchers(true);
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'Failed to create all vouchers.');
      await approvedVouchersQuery.refetch();
    } finally {
      setBulkBusy(false);
    }

    async function loadAllVoucherDocuments(
      rows: Array<{ ep: AffectedPerson; vouchers: Awaited<ReturnType<typeof listVouchers>> }> = approvedVouchersQuery.data ?? [],
    ) {
      const documents = await Promise.all(
        rows.flatMap(({ ep, vouchers }) => {
          const voucher = currentVoucher(vouchers);
          if (!voucher) return [];
          return [Promise.all([
            fetchEpFileData(ep.affected_person_id),
            fetchVoucher(ep.affected_person_id, voucher.voucher_id),
          ]).then(([fileData, fullVoucher]) => ({
            ep,
            fileData: fileData as unknown as EpFileData,
            voucher: fullVoucher as VoucherFullData,
          }))];
        }),
      );
      setBulkDocuments(documents);
    }
  }

  async function approveAllVouchers() {
    setBulkBusy(true);
    setBulkError('');
    setBulkMessage('');
    try {
      for (const { ep, voucher } of pendingApprovedVouchers) {
        await approveVoucher(ep.affected_person_id, voucher.voucher_id);
      }
      setBulkMessage(`Approved ${pendingApprovedVouchers.length} voucher${pendingApprovedVouchers.length === 1 ? '' : 's'}.`);
      await approvedVouchersQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ['eps'] });
      await queryClient.invalidateQueries({ queryKey: ['payment-register'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'Failed to approve all vouchers.');
      await approvedVouchersQuery.refetch();
    } finally {
      setBulkBusy(false);
    }
  }

  async function approveOneVoucher(epId: number, voucherId: number) {
    setBulkBusy(true);
    setBulkError('');
    setBulkMessage('');
    try {
      await approveVoucher(epId, voucherId);
      setBulkMessage('Voucher approved.');
      await queryClient.invalidateQueries({ queryKey: ['voucher-file', selected?.affected_person_id, voucherId] });
      await queryClient.invalidateQueries({ queryKey: ['ep', epId] });
      await queryClient.invalidateQueries({ queryKey: ['eps'] });
      await queryClient.invalidateQueries({ queryKey: ['payment-register'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      await approvedVouchersQuery.refetch();
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'Failed to approve voucher.');
    } finally {
      setBulkBusy(false);
    }
  }

  function printAllVouchers() {
    window.print();
  }

  // The lookup returns the parent EP for Tenant/Wage Labour cards. Vouchers
  // belong to that parent's EC, so use the first available voucher by default
  // while still allowing the user to choose another voucher.
  useEffect(() => {
    const firstVoucher = vouchersQuery.data ? currentVoucher(vouchersQuery.data) : undefined;
    if (selected && voucherId === null && firstVoucher) {
      setVoucherId(firstVoucher.voucher_id);
    }
  }, [selected, voucherId, vouchersQuery.data]);

  useEffect(() => {
    if (
      !selected
      || !['APPROVED', 'PAID'].includes(String(fileData?.status))
      || !vouchersQuery.isFetched
      || (fileData?.status !== 'PAID' && (vouchersQuery.data ?? []).length > 0)
      || (fileData?.status === 'PAID' && (vouchersQuery.data ?? []).some((voucher) => voucher.payment_status === 'PENDING' && !voucher.approved_by))
      || createMut.isPending
      || createMut.isSuccess
      || autoCreateAttempt.current === selected.affected_person_id
    ) {
      return;
    }

    autoCreateAttempt.current = selected.affected_person_id;
    createMut.mutate();
  }, [
    selected,
    fileData?.status,
    vouchersQuery.isFetched,
    vouchersQuery.data,
    createMut,
  ]);

  if (fileQuery.isLoading || voucherQuery.isLoading) {
    return <LoadingSpinner message="Generating Voucher File..." />;
  }
  if (fileQuery.error || voucherQuery.error) {
    return <ErrorDisplay message="Failed to load Voucher File data." />;
  }
  if (selected?.card_kind === 'tenant' && !tenant && fileData) {
    return <ErrorDisplay message="The selected Tenant EP record could not be resolved." />;
  }
  if (selected?.card_kind === 'worker' && !worker && fileData) {
    return <ErrorDisplay message="The selected Wage Labour EP record could not be resolved." />;
  }
  if (fileData && selected && !['APPROVED', 'PAID'].includes(String(fileData.status))) {
    return (
      <PageLayout className="voucher-page" title="Voucher File" subtitle="Generate the official Debit Voucher for a main EP, Tenant EP, or Wage Labour EP.">
        <ErrorDisplay message="Voucher Files can only be generated after the parent EP is approved." />
      </PageLayout>
    );
  }

  if (fileData && selected && voucherQuery.data) {
    return (
      <div>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 print:hidden sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setVoucherId(null);
              setInput('');
              autoCreateAttempt.current = null;
            }}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            ← New Voucher
          </button>
          <div className="flex items-center gap-3">
            {!(voucherQuery.data as VoucherFullData).approved_by && (
              <button
                type="button"
                onClick={() => void approveOneVoucher(selected.affected_person_id, (voucherQuery.data as VoucherFullData).voucher_id)}
                disabled={bulkBusy}
                className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Approve Voucher
              </button>
            )}
            <span className="text-xs text-gray-500">Use Print / Save PDF to download the voucher.</span>
          </div>
        </div>
        <VoucherDocument
          data={{ ...fileData, project: project?.name ?? fileData.project }}
          voucher={voucherQuery.data as VoucherFullData}
          tenant={tenant}
          worker={worker}
        />
      </div>
    );
  }

  return (
    <PageLayout title="Voucher File" subtitle="Generate the official Debit Voucher for a main EP, Tenant EP, or Wage Labour EP.">
      <div className="voucher-bulk-management mx-auto mb-6 max-w-5xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Approved EP Vouchers</h2>
            <p className="text-xs text-gray-500">Create vouchers for all approved EPs in the selected project and approve them individually or together.</p>
            <p className="mt-1 text-xs text-gray-500">
              {approvedVouchersQuery.isLoading
                ? 'Loading approved EPs...'
                : approvedVouchersQuery.error
                  ? 'Could not load approved EPs.'
                  : `${approvedVoucherRows.length} approved EP${approvedVoucherRows.length === 1 ? '' : 's'} found.`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void createAllApprovedVouchers()}
              disabled={bulkBusy || approvedVouchersQuery.isLoading || !!approvedVouchersQuery.error || approvedVoucherRows.length === 0}
              className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {bulkBusy ? 'Processing...' : 'Create Voucher All Approved EP'}
            </button>
            {pendingApprovedVouchers.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Approve all ${pendingApprovedVouchers.length} vouchers?`)) void approveAllVouchers();
                }}
                disabled={bulkBusy}
                className="rounded bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Approve All Voucher
              </button>
            )}
          </div>
        </div>
        {bulkMessage && <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-700">{bulkMessage}</p>}
        {bulkError && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{bulkError}</p>}
        {approvedVouchersQuery.error && (
          <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">
            {approvedVouchersQuery.error instanceof Error
              ? approvedVouchersQuery.error.message
              : 'Failed to load approved EPs.'}
          </p>
        )}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2">EP ID</th>
                <th className="py-2">Name</th>
                <th className="py-2">Voucher</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {activeApprovedVouchers.map(({ ep, voucher }) => (
                <tr key={voucher.voucher_id} className="border-b border-gray-100">
                  <td className="py-2 font-mono">{ep.ep_id ?? '—'}</td>
                  <td className="py-2">{ep.name}</td>
                  <td className="py-2">
                    {voucher.voucher_number}
                    {voucher.is_additional && (
                      <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                        Additional Payment
                      </span>
                    )}
                  </td>
                  <td className="py-2">{voucher.approved_by ? 'APPROVED' : 'PENDING'}</td>
                  <td className="py-2 text-right">
                    {!voucher.approved_by && (
                      <button
                        type="button"
                        onClick={() => void approveOneVoucher(ep.affected_person_id, voucher.voucher_id)}
                        disabled={bulkBusy}
                        className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve Voucher
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!approvedVouchersQuery.isLoading && activeApprovedVouchers.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-gray-400">No vouchers created yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* ── Additional-payment worklist: PAID EPs with new loss data ── */}
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-blue-900">Additional Payment — EPs with new loss data</h3>
              <p className="mt-0.5 text-xs text-blue-800">
                When new land, crop, structure, tree or business data is added to a PAID EP,
                it appears here immediately with an <strong>Additional Payment</strong> remark —
                no need to search through 1000+ EPs.
              </p>
              <p className="mt-1 text-xs text-blue-700">
                {additionalPendingQuery.isLoading
                  ? 'Loading additional payments...'
                  : additionalPendingQuery.error
                    ? 'Could not load additional payments.'
                    : `${additionalPendingRows.length} paid EP${additionalPendingRows.length === 1 ? '' : 's'} waiting for an additional voucher.`}
              </p>
            </div>
            <input
              value={additionalSearch}
              onChange={(event) => setAdditionalSearch(event.target.value)}
              placeholder="Search EP ID / Name / NID…"
              autoComplete="off"
              className="w-64 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          {additionalPendingQuery.error && (
            <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">
              {additionalPendingQuery.error instanceof Error
                ? additionalPendingQuery.error.message
                : 'Failed to load additional payments.'}
            </p>
          )}
          <div className="mt-3 overflow-x-auto rounded-md border border-blue-100 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-100 text-left text-xs text-blue-700">
                  <th className="py-2 pl-3">EP ID</th>
                  <th className="py-2">Name</th>
                  <th className="py-2 text-right">Est. Additional</th>
                  <th className="py-2 pl-3">Remark</th>
                  <th className="py-2 pr-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {additionalPendingRows.map((row) => (
                  <tr key={row.affected_person_id} className="border-b border-blue-50">
                    <td className="py-2 pl-3 font-mono">{row.ep_id ?? '—'}</td>
                    <td className="py-2">{row.name}</td>
                    <td className="py-2 text-right">{row.estimated_additional_amount}</td>
                    <td className="py-2 pl-3">
                      <span className="mb-1 inline-block rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-medium text-white">
                        Additional Payment
                      </span>
                      <span className="block text-xs text-gray-700">{row.remark}</span>
                      {row.has_active_voucher && (
                        <span className="mt-0.5 block text-xs text-amber-700">
                          Voucher {row.active_voucher_number ?? ''} must be finished first.
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <Link
                        to={`/ep/${row.affected_person_id}/voucher`}
                        className="text-blue-700 hover:underline"
                      >
                        Open Voucher →
                      </Link>
                    </td>
                  </tr>
                ))}
                {!additionalPendingQuery.isLoading && additionalPendingRows.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-gray-400">No additional payments waiting.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {showAllVouchers && bulkDocuments.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 sm:p-8 print:static print:block print:bg-transparent print:p-0">
            <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl print:max-h-none print:overflow-visible print:rounded-none print:p-0 print:shadow-none">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                All Voucher Files ({bulkDocuments.length})
              </h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={printAllVouchers}
                  className="rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 print:hidden"
                >
                  Print / Download All PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllVouchers(false)}
                  className="text-xs text-gray-500 hover:underline print:hidden"
                >
                  Hide Voucher Files
                </button>
              </div>
            </div>
            <div className="bulk-voucher-print">
            {bulkDocuments.map(({ ep, fileData, voucher }, index) => (
              <div key={voucher.voucher_id} className="bulk-voucher-print-item">
                <div className="bulk-voucher-meta mb-2 flex items-center justify-between text-xs text-gray-600">
                  <span>{ep.ep_id ?? '—'} — {ep.name}</span>
                  <span>{voucher.voucher_number}</span>
                </div>
                <VoucherDocument
                  data={{ ...fileData, project: project?.name ?? fileData.project }}
                  voucher={voucher}
                  showActions={false}
                  pageNumber={index + 1}
                  pageCount={bulkDocuments.length}
                />
              </div>
            ))}
            </div>
            </div>
          </div>
        )}
      </div>
      <div className="voucher-search-panel mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <label htmlFor="voucher-ep-id" className="mb-1 block text-sm font-semibold text-gray-800">EP ID</label>
        <p className="mb-3 text-xs text-gray-500">Search by main EP ID, Tenant EP ID, Wage Labour EP ID, name, or NID.</p>
        <input
          id="voucher-ep-id"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setSelected(null);
            setVoucherId(null);
            autoCreateAttempt.current = null;
          }}
          placeholder="Enter EP ID / Name / NID…"
          autoComplete="off"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {query.length >= 2 && !selected && lookup.data && (
          <div className="mt-1 max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
            {lookup.data.map((match) => (
              <button
                key={match.affected_person_id}
                type="button"
                onClick={() => {
                  setSelected(match);
                  setVoucherId(null);
                  autoCreateAttempt.current = null;
                }}
                className="flex w-full justify-between gap-3 border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span className="font-mono text-blue-700">
                  {match.card_subject_ep_id ?? match.ep_id ?? '—'}
                  <span className="ml-2 font-sans text-gray-800">{match.card_subject_name ?? match.name}</span>
                </span>
                <span className="text-xs text-gray-400">
                  {match.card_kind === 'tenant' ? 'Tenant' : match.card_kind === 'worker' ? 'Wage Labour' : 'Main EP'}
                </span>
              </button>
            ))}
          </div>
        )}
        {selected && (
          <div className="mt-4">
            <div className="mb-2 text-xs text-gray-600">
              Selected: <span className="font-mono font-medium">{selected.card_subject_ep_id ?? selected.ep_id}</span>
              {' — '}{selected.card_subject_name ?? selected.name}
            </div>
            {vouchersQuery.isLoading || createMut.isPending ? <LoadingSpinner message="Preparing Voucher File..." /> : (
              (vouchersQuery.data ?? []).length === 0 ? (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                  {getMutationMessage(createMut.error)}
                </div>
              ) : (
                <select
                  value={voucherId ?? ''}
                  onChange={(event) => setVoucherId(event.target.value ? Number(event.target.value) : null)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {(vouchersQuery.data ?? []).map((voucher) => (
                    <option key={voucher.voucher_id} value={voucher.voucher_id}>
                      {voucher.voucher_number} — {voucher.approved_amount}
                    </option>
                  ))}
                </select>
              )
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function getMutationMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'The parent EP must be approved and have a compensation amount available.';
}
