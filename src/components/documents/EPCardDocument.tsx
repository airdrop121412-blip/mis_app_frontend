// ═══════════════════════════════════════════════════════════════
// EPCardDocument — EP ID Card (portrait A4)
// Official identification card for the entitled person
// ═══════════════════════════════════════════════════════════════

import type { EpFileData } from '../../types/ep';
import { DocumentHeader } from './DocumentHeader';
import { occupationLabel } from '../../utils/occupation';

interface EPCardDocumentProps {
  data: EpFileData;
}

export function EPCardDocument({ data }: EPCardDocumentProps) {
  const val = (v: unknown) => v != null && v !== '' ? String(v) : '—';

  // Mouza from the first land record (reference card shows it)
  const mouza = (data.lands ?? []).find((l) => l.mouza)?.mouza ?? '—';

  return (
    <>
      <DocumentHeader
        docTitle="Entitled Person (EP) Identification Card"
        projectName={data.project ?? ''}
        epType="[TITLED/NON-TITLED EP]"
      />

      <div className="ep-card-body">
        <div className="ep-card-grid">
          <Field label="EP ID" value={val(data.ep_id)} />
          <Field label="NID No" value={val(data.nid_number)} />
          <Field label="Name" value={val(data.name)} />
          <Field label="Sex" value={val(data.gender)} />
          <Field label="Father/Husband Name" value={val(data.father_name)} />
          <Field label="Mother Name" value={val(data.mother_name)} />
          <Field label="Occupation" value={val(occupationLabel({ occupation: data.occupation ?? null, occupation_other: data.occupation_other }))} />
          <Field label="Mobile No" value={val(data.mobile)} />
          <Field label="Yearly Income (BDT)" value={data.monthly_income ? String(Number(data.monthly_income) * 12) : '—'} />
          <Field label="District" value={val(data.district)} />
          <Field label="Upazila" value={val(data.upazila)} />
          <Field label="Union" value="—" />
          <Field label="Mouza" value={mouza} />
          <Field label="Ownership" value={val(data.land_status)} />
          <Field label="Project" value={val(data.project)} />
        </div>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginTop: 40, borderTop: '1px solid #333', paddingTop: 4, minWidth: 120 }}>
              Signature of EP
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginTop: 40, borderTop: '1px solid #333', paddingTop: 4, minWidth: 120 }}>
              Area Manager, KMC
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="field-label">{label}</div>
      <div className="field-value">{value}</div>
    </div>
  );
}
