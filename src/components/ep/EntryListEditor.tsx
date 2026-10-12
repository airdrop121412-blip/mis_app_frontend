// ═══════════════════════════════════════════════════════════════
// EntryListEditor — one-line list + single "new entry" form with
// Save / Save & Add More, used by the EP wizard child-record steps.
//
// Keeps a local draft; on Save the draft is committed to the parent's
// saved list (via onSave) and the form is cleared for the next entry.
// Validation here is purely a guard for the fields flagged in
// `requiredFields` — business rules still live on the backend.
// ═══════════════════════════════════════════════════════════════

import { useState, type ReactNode } from 'react';

export interface EntryColumn<T> {
  header: string;
  render: (entry: T, index: number) => ReactNode;
}

interface EntryListEditorProps<T> {
  /** Singular label for the add-form heading, e.g. "Land Parcel". */
  title: string;
  /** Shown when there are no saved entries yet. */
  emptyMessage: string;
  entries: T[];
  createEmpty: () => T;
  /** Field names that must be truthy before the entry can be saved. */
  requiredFields: string[];
  renderFields: (draft: T, update: (field: string, value: unknown) => void) => ReactNode;
  summaryColumns: EntryColumn<T>[];
  onSave: (entry: T) => void;
  onRemove: (index: number) => void;
}

export function EntryListEditor<T>({
  title,
  emptyMessage,
  entries,
  createEmpty,
  requiredFields,
  renderFields,
  summaryColumns,
  onSave,
  onRemove,
}: EntryListEditorProps<T>) {
  const [draft, setDraft] = useState<T>(createEmpty);
  const [errors, setErrors] = useState<string | null>(null);

  function update(field: string, value: unknown) {
    setDraft((prev) => ({ ...prev, [field]: value }) as T);
    if (errors) setErrors(null);
  }

  function save() {
    const rec = draft as Record<string, unknown>;
    for (const f of requiredFields) {
      const v = rec[f];
      if (v === 0 || v === '' || v === null || v === undefined) {
        setErrors('Please complete the required fields (marked with *) before saving.');
        return;
      }
    }
    onSave(draft);
    setDraft(createEmpty());
    setErrors(null);
  }

  return (
    <div>
      {/* ── One-line list of saved entries ─────────────────────── */}
      {entries.length === 0 ? (
        <p className="mb-5 rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">
          {emptyMessage}
        </p>
      ) : (
        <div className="mb-5 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">#</th>
                {summaryColumns.map((col, i) => (
                  <th key={i} className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">{col.header}</th>
                ))}
                <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-500">{idx + 1}</td>
                  {summaryColumns.map((col, i) => (
                    <td key={i} className="px-3 py-2 text-sm text-gray-700">{col.render(entry, idx)}</td>
                  ))}
                  <td className="whitespace-nowrap px-3 py-2 text-right text-sm">
                    <button type="button" onClick={() => onRemove(idx)} className="text-xs font-medium text-red-600 hover:text-red-700">
                      ✕ Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── New entry form ─────────────────────────────────────── */}
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700">
          New {title} {entries.length > 0 ? `#${entries.length + 1}` : ''}
        </h4>
        {errors && (
          <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600">{errors}</p>
        )}
        {renderFields(draft, update)}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => save()}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => save()}
            className="rounded border border-blue-500 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            Save &amp; Add More
          </button>
        </div>
      </div>
    </div>
  );
}