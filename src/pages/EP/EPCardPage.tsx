// ═══════════════════════════════════════════════════════════════
// EPCardPage — EP ID Card document page
// Fetches EP data via file-data endpoint, renders EP ID Card
// ═══════════════════════════════════════════════════════════════

import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchEpFileData } from '../../api/ep';
import type { EpFileData } from '../../types/ep';
import { DocumentPage } from '../../components/documents/DocumentPage';
import { EPCardDocument } from '../../components/documents/EPCardDocument';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';

export function EPCardPage() {
  const { id } = useParams<{ id: string }>();
  const epId = Number(id);

  const { data, isLoading, error } = useQuery({
    queryKey: ['ep-file-data', epId],
    queryFn: () => fetchEpFileData(epId),
    enabled: !!epId,
  });

  if (isLoading) return <LoadingSpinner message="Loading EP Card data..." />;
  if (error) return <ErrorDisplay message={error instanceof Error ? error.message : 'Failed to load EP data'} />;
  if (!data) return <ErrorDisplay message="EP not found." />;

  const epData = data as unknown as EpFileData;

  return (
    <DocumentPage
      title={`EP Card — ${epData.ep_id ?? epData.name}`}
      orientation="portrait"
      controls={
        <Link
          to={`/ep/${epId}`}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
        >
          ← Back to EP
        </Link>
      }
    >
      <EPCardDocument data={epData} />
    </DocumentPage>
  );
}
