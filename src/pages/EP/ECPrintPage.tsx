// ═══════════════════════════════════════════════════════════════
// ECPrintPage — EC document print page
// Fetches EP file-data, renders ECDocument for printing
// ═══════════════════════════════════════════════════════════════

import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchEpFileData } from '../../api/ep';
import type { EpFileData } from '../../types/ep';
import { DocumentPage } from '../../components/documents/DocumentPage';
import { ECDocument } from '../../components/documents/ECDocument';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';

export function ECPrintPage() {
  const { id } = useParams<{ id: string }>();
  const epId = Number(id);

  const { data, isLoading, error } = useQuery({
    queryKey: ['ep-file-data', epId],
    queryFn: () => fetchEpFileData(epId),
    enabled: !!epId,
  });

  if (isLoading) return <LoadingSpinner message="Loading EC data..." />;
  if (error) return <ErrorDisplay message={error instanceof Error ? error.message : 'Failed to load EP data'} />;
  if (!data) return <ErrorDisplay message="EP not found." />;

  const epData = data as unknown as EpFileData;

  return (
    <DocumentPage
      title={`EC — ${epData.ep_id ?? epData.name}`}
      orientation="landscape"
      controls={
        <Link
          to={`/ep/${epId}/ec`}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
        >
          ← Back to EC
        </Link>
      }
    >
      <ECDocument data={epData} />
    </DocumentPage>
  );
}