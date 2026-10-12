// ═══════════════════════════════════════════════════════════════
// PersonalInfoSection — EP personal information grid
// Matches the EP File section 1 layout exactly (reference EP.pdf):
//   Left:  Name, Sex, Upazila, Mouza, Ownership, EP ID, NID No
//   Right: District, Union, Mobile No, Occupation, Yearly Income, F/H Name
// ═══════════════════════════════════════════════════════════════

import type { AffectedPerson } from '../../types/ep';
import { occupationLabel } from '../../utils/occupation';

interface PersonalInfoSectionProps {
  ep: AffectedPerson;
  /** Mouza from the EP's land records (reference shows it in section 1). */
  mouza?: string;
}

export function PersonalInfoSection({ ep, mouza }: PersonalInfoSectionProps) {
  const val = (v: unknown) => v != null && v !== '' ? String(v) : '';

  return (
    <>
      <div className="doc-section-title">1. EP&apos;s Personal Information:</div>
      <div className="personal-info-grid">
        {/* Left column */}
        <div>
          <InfoRow label="Name" value={val(ep.name)} />
          <InfoRow label="Sex" value={val(ep.gender)} />
          <InfoRow label="Upazila" value={val(ep.upazila)} />
          <InfoRow label="Mouza" value={val(mouza)} />
          <InfoRow label="Ownership" value={val(ep.land_status)} />
          <InfoRow label="EP ID" value={val(ep.ep_id)} />
          <InfoRow label="NID No" value={val(ep.nid_number)} />
        </div>
        {/* Right column */}
        <div>
          <InfoRow label="District" value={val(ep.district)} />
          <InfoRow label="Union" value="" />
          <InfoRow label="Mobile No" value={val(ep.mobile)} />
          <InfoRow label="Occupation" value={val(occupationLabel({ occupation: ep.occupation ?? null, occupation_other: ep.occupation_other }))} />
          <InfoRow label="Yearly Income (BDT)" value={ep.monthly_income ? String(Number(ep.monthly_income) * 12) : ''} />
          <InfoRow label="F/H Name" value={val(ep.father_name)} />
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}:</span>
      <span className="info-value">{value}</span>
    </div>
  );
}
