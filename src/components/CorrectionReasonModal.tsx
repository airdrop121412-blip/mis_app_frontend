// ═══════════════════════════════════════════════════════════════
// CorrectionReasonModal — Captures WHY an APPROVED EP is being
// corrected or deleted. The reason is stored in Correction History
// together with the HH ID, the change type and the acting user.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';

export type CorrectionAction = 'edit' | 'delete';

interface CorrectionReasonModalProps {
  open: boolean;
  action: CorrectionAction;
  /** HH ID + EP ID + name, shown so the admin confirms the right record. */
  hhId: string | null;
  epCode: string | null;
  name: string;
  isPending?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

export function CorrectionReasonModal({
  open,
  action,
  hhId,
  epCode,
  name,
  isPending = false,
  error = null,
  onCancel,
  onConfirm,
}: CorrectionReasonModalProps) {
  const [reason, setReason] = useState('');

  // Reset the textarea each time the modal is opened for a new row.
  useEffect(() => {
    if (open) setReason('');
  }, [open, action, hhId]);

  if (!open) return null;

  const isDelete = action === 'delete';
  const valid = reason.trim().length >= 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">
          {isDelete ? 'Delete approved EP' : 'Correct approved EP'}
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          {isDelete
            ? 'This permanently removes the EP and all of its child records. The reason is kept in Correction History.'
            : 'Give the reason for this correction. It is saved in Correction History before the change is applied.'}
        </p>

        <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="text-gray-500">
              HH ID: <span className="font-mono font-medium text-gray-900">{hhId ?? '—'}</span>
            </span>
            <span className="text-gray-500">
              EP ID: <span className="font-mono font-medium text-gray-900">{epCode ?? '—'}</span>
            </span>
          </div>
          <div className="mt-1 text-gray-500">
            Name: <span className="font-medium text-gray-900">{name}</span>
          </div>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Cause of {isDelete ? 'delete' : 'edit'} <span className="text-red-500">*</span>
          </span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            autoFocus
            placeholder={
              isDelete
                ? 'e.g. EP approved by mistake — duplicate of HH 0012'
                : 'e.g. Name and NID corrected from the signed paper record'
            }
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>

        {!valid && reason.length > 0 && (
          <p className="mt-1 text-xs text-amber-600">Please describe the reason (at least 4 characters).</p>
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={!valid || isPending}
            className={`rounded px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
              isDelete ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isPending
              ? 'Saving...'
              : isDelete
                ? 'Delete and save reason'
                : 'Save reason and continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
