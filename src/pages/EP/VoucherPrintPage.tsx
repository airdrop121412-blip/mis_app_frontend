// ═══════════════════════════════════════════════════════════════
// VoucherPrintPage — Debit Voucher document page
// Fetches EP file-data + voucher detail, renders VoucherDocument
// Route: /ep/:id/voucher/:vid/print
// ═══════════════════════════════════════════════════════════════

import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchEpFileData } from '../../api/ep';
import { fetchVoucher } from '../../api/voucher';
import type { EpFileData } from '../../types/ep';
import type { VoucherFullData } from '../../types/voucher';
import { DocumentPage } from '../../components/documents/DocumentPage';
import { VoucherDocument } from '../../components/documents/VoucherDocument';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';

export function VoucherPrintPage() {
  const { id, vid } = useParams<{ id: string; vid: string }>();
  const epId = Number(id);
  const voucherId = Number(vid);

  const epQuery = useQuery({
    queryKey: ['ep-file-data', epId],
    queryFn: () => fetchEpFileData(epId),
    enabled: !!epId,
  });

  const voucherQuery = useQuery({
    queryKey: ['voucher', epId, voucherId],
    queryFn: () => fetchVoucher(epId, voucherId),
    enabled: !!epId && !!voucherId,
  });

  if (epQuery.isLoading || voucherQuery.isLoading) {
    return <LoadingSpinner message="Loading Voucher data..." />;
  }
  if (epQuery.error) {
    return <ErrorDisplay message={epQuery.error instanceof Error ? epQuery.error.message : 'Failed to load EP data'} />;
  }
  if (voucherQuery.error) {
    return <ErrorDisplay message={voucherQuery.error instanceof Error ? voucherQuery.error.message : 'Failed to load voucher'} />;
  }
  if (!epQuery.data || !voucherQuery.data) {
    return <ErrorDisplay message="Voucher or EP not found." />;
  }

  const epData = epQuery.data as unknown as EpFileData;
  const voucher = voucherQuery.data as VoucherFullData;

  return (
    <DocumentPage
      title={`Debit Voucher — ${voucher.voucher_number}`}
      orientation="landscape"
      controls={
        <Link
          to={`/ep/${epId}/voucher/${voucherId}`}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
        >
          ← Back to Voucher
        </Link>
      }
    >
      <VoucherDocument data={epData} voucher={voucher} />
    </DocumentPage>
  );
}