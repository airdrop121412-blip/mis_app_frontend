// ═══════════════════════════════════════════════════════════════
// CorrectionEditModal — Admin edit of an APPROVED EP.
//
// Hosts the full 10-step EP wizard (EP Information → GPS Location)
// inside a modal. The reason captured on the Correction screen is
// passed down so the save is written together with its audit trail.
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { EPForm } from '../pages/EP/EPForm';

interface CorrectionEditModalProps {
  open: boolean;
  affectedPersonId: number | null;
  hhId: string | null;
  epCode: string | null;
  name: string;
  /** Reason captured in CorrectionReasonModal; stored in Correction History. */
  reason: string;
  onClose: () => void;
  onSaved: () => void;
}

export function CorrectionEditModal({
  open,
  affectedPersonId,
  hhId,
  epCode,
  name,
  reason,
  onClose,
  onSaved,
}: CorrectionEditModalProps) {
  // Freeze the page behind the modal while the wizard is open.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !affectedPersonId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
      <div className="mx-auto w-full max-w-6xl rounded-xl border border-gray-200 bg-white shadow-2xl">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Correction — EP {epCode ?? ''}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              HH ID: <span className="font-mono">{hhId ?? '—'}</span> · {name} · Steps 1 to 10
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            ✕ Close
          </button>
        </div>

        {/* ── Captured reason ────────────────────────────────── */}
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-800">
          <span className="font-semibold">Cause of correction:</span> {reason}
        </div>

        {/* ── Wizard body ────────────────────────────────────── */}
        <div className="max-h-[75vh] overflow-y-auto px-6 py-4">
          <EPForm
            overrideEpId={affectedPersonId}
            correctionReason={reason}
            onSaved={onSaved}
          />
        </div>
      </div>
    </div>
  );
}
