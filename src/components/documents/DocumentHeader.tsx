// ═══════════════════════════════════════════════════════════════
// DocumentHeader — Standard government document header
// Matches the DWASA MIS official header format
// ═══════════════════════════════════════════════════════════════

interface DocumentHeaderProps {
  docTitle: string;            // e.g. "Entitled Person's (EP) File"
  projectName?: string;
  epType?: string;             // e.g. "[TITLED/NON-TITLED EP]"
  date?: string;
  pageNumber?: number;
  totalPages?: number;
}

export function DocumentHeader({
  docTitle,
  projectName = '',
  epType = '[TITLED/NON-TITLED EP]',
  date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
  pageNumber,
  totalPages,
}: DocumentHeaderProps) {
  return (
    <div className="doc-header">
      <div className="govt-line">Government of the People's Republic of Bangladesh</div>
      <div className="authority-line">Dhaka Water Supply and Sewerage Authority (DWASA)</div>
      <div className="doc-title">{docTitle}</div>
      <div className="date-page">
        <span>{date}</span>
        {pageNumber !== undefined && totalPages !== undefined && (
          <span>Page {pageNumber} of {totalPages}</span>
        )}
      </div>
      {projectName && <div className="project-line">{projectName}</div>}
      <div className="ep-type">{epType}</div>
    </div>
  );
}
