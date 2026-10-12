// ═══════════════════════════════════════════════════════════════
// DocumentPage — Reusable wrapper for printable documents
// Provides: header controls, paper wrapper, print button
// ═══════════════════════════════════════════════════════════════

import { PrintButton } from './PrintButton';
import '../../styles/documents.css';

interface DocumentPageProps {
  title: string;
  children: React.ReactNode;
  orientation?: 'landscape' | 'portrait';
  controls?: React.ReactNode;
  className?: string;
}

export function DocumentPage({ children, orientation = 'landscape', controls, className }: DocumentPageProps) {
  return (
    <div className="document-page">
      <div className="document-controls">
        <PrintButton />
        {controls}
      </div>
      <div className={`document-paper ${orientation}${className ? ` ${className}` : ''}`}>
        {children}
      </div>
    </div>
  );
}
