// ═══════════════════════════════════════════════════════════════
// epicadValues — resolve document placeholders from EP file data.
//
// Placeholders look like {{worker.name}}, {{field}}, or {{ep.field}}.
// Values are pulled from the Affected Person and (for land details) the
// first land record, which is what the EPICAD card layout reports.
//
// EPICAD also generates cards for a SUBJECT other than the affected
// person (a Tenant or Wage Labour worker). When a subject is passed:
//   • {{ep.*}}        → the Affected Person (parent EP) data
//   • {{worker.*}}    → the subject's data
//   • {{tenant.*}}    → the subject's data
//   • {{field}} (no prefix) → the subject's data
// Without a subject the behaviour is unchanged (all resolve to the EP).
// ═══════════════════════════════════════════════════════════════

import type { EpFileData } from '../../types/ep';
import { occupationLabel } from '../../utils/occupation';

// A printable card subject (Affected Person, Tenant, or Worker).
export interface CardSubject {
  ep_id?: string | null;
  name?: string | null;
  father_name?: string | null;
  spouse_name?: string | null;
  mother_name?: string | null;
  nid_number?: string | null;
  mobile?: string | null;
  gender?: string | null;
  gender_name?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  occupation?: string | null;
  religion?: string | null;
  mouza?: string | null;
  union_name?: string | null;
  district?: string | null;
  district_name?: string | null;
  upazila?: string | null;
  upazila_name?: string | null;
  present_address?: string | null;
  address?: string | null;
  village?: string | null;
  dag_number?: string | null;
  khatian_number?: string | null;
  land_area?: string | null;
  area_unit?: string | null;
  identification_mark?: string | null;
  education?: string | null;
  [key: string]: unknown;
}

// Bangla digit conversion for display.
const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export function toBn(s: string | number | null | undefined): string {
  if (s == null || s === '') return '';
  return String(s).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

function strVal(v: unknown): string {
  return v != null && v !== '' ? String(v) : '';
}

export function valueOf(data: EpFileData, field: string, subject?: CardSubject | null): string {
  const clean = field.replace(/^(worker\.|ep\.|tenant\.)/, '').trim();

  const firstRow = (data.lands && data.lands.length > 0
    ? data.lands[0] as unknown as Record<string, unknown>
    : {}) as Record<string, unknown>;

  // When a card subject is provided, all non-{{ep.*}} placeholders
  // resolve against that subject instead of the affected person.
  const useSubject = !!subject && !field.startsWith('ep.');
  // Relation objects (e.g. gender/district/upazila from eager loads)
  // unwrap to their display `name`.
  const sv = (key: string): string => {
    if (!useSubject) return '';
    const v = (subject as Record<string, unknown>)[key];
    if (v && typeof v === 'object') {
      const name = (v as Record<string, unknown>).name;
      return name != null && name !== '' ? String(name) : '';
    }
    return strVal(v);
  };

  // ── Direct / mapped lookups ────────────────────────────────
  switch (clean) {
    case 'photo': return ''; // no EP photo source → empty (silhouette in CSS)
    case 'name': return useSubject ? sv('name') : data.name ?? '';
    case 'father_or_husband_name':
    case 'father_name': return useSubject
      ? sv('father_name') || sv('spouse_name')
      : (data.father_name ?? data.spouse_name) ?? '';
    case 'mother_name': return useSubject ? sv('mother_name') || (data.mother_name ?? '') : data.mother_name ?? '';
    case 'gender': return useSubject ? sv('gender') || sv('gender_name') : data.gender ?? '';
    case 'nid':
    case 'nid_number': return useSubject ? sv('nid_number') : data.nid_number ?? '';
    case 'mobile':
    case 'mobile_no': return useSubject ? sv('mobile') : data.mobile ?? '';
    case 'date_of_birth': return useSubject ? sv('date_of_birth') : data.date_of_birth ?? '';
    case 'age': return useSubject ? sv('age') : data.age != null ? String(data.age) : '';
    case 'primary_occupation':
    case 'occupation':
      if (useSubject) {
        const subj = subject as Record<string, unknown>;
        return occupationLabel({
          occupation: subj.occupation as string | { name?: string } | null | undefined,
          occupation_name: subj.occupation_name as string | undefined,
          occupation_other: subj.occupation_other as string | null | undefined,
        });
      }
      return occupationLabel({
        occupation: data.occupation ?? null,
        occupation_other: (data as unknown as Record<string, unknown>).occupation_other as string | null | undefined,
      });
    case 'religion': return useSubject ? sv('religion') || (data.religion ?? '') : data.religion ?? '';
    case 'mouza': return useSubject ? sv('mouza') : data.mouza ?? '';
    case 'union':
    case 'union_name': return useSubject ? sv('union_name') : data.union_name ?? '';
    case 'upazila': return useSubject ? sv('upazila') || sv('upazila_name') : data.upazila ?? '';
    case 'district': return useSubject ? sv('district') || sv('district_name') : data.district ?? '';
    case 'address':
    case 'present_address': return useSubject ? sv('present_address') || sv('address') : toStringVal((data as unknown as Record<string, unknown>)[clean]);
    case 'ep':
    case 'ep_id': return useSubject ? sv('ep_id') : data.ep_id ?? '';
    case 'business_name': {
      if (!useSubject) return '';
      const raw = (subject as Record<string, unknown>);
      const direct = raw.business_name;
      const business = raw.business as Record<string, unknown> | null | undefined;
      return strVal(direct ?? business?.business_name ?? '');
    }
    case 'village': return useSubject ? sv('village') : toStringVal(firstRow.village);
    case 'dag_number': return useSubject ? sv('dag_number') : toStringVal(firstRow.dag_number);
    case 'khatian_number':
    case 'khatian': return useSubject ? sv('khatian_number') : toStringVal(firstRow.khatian_number);
    case 'land_quantity':
    case 'land_area': return useSubject ? sv('land_area') : toStringVal(firstRow.land_area);
    case 'area_unit':
    case 'land_area_unit': return useSubject ? sv('area_unit') : toStringVal(firstRow.area_unit);

    // Common EP string columns kept as-is (may be empty).
    case 'identification_mark':
    case 'education':
    case 'category_of_loss':
    case 'ownership':
    case 'land_status':
    case 'rc_type': {
      const anyData = data as unknown as Record<string, unknown>;
      return useSubject ? sv(clean) : toStringVal(anyData[clean]);
    }

    default:
      if (useSubject) {
        return sv(clean);
      }
      return toStringVal((data as unknown as Record<string, unknown>)[clean]);
  }
}

function toStringVal(v: unknown): string {
  return v != null && v !== '' ? String(v) : '';
}

/**
 * Replace all {{...}} placeholders in an HTML template with values.
 * Pass an optional `subject` (tenant / wage-labour worker) to render a
 * card for that entity; otherwise the card renders the affected person.
 */
export function fillTemplate(
  html: string,
  data: EpFileData,
  opts: { bnDigits?: boolean } = {},
  subject?: CardSubject | null,
): string {
  let out = html;
  // Reserved: EP ID rendered as individual digit boxes (Bangla digits) for
  // the "পরিচয় পত্র নম্বর" id-number-box strip.
  out = out.replace(/\{\{\s*ep_id_boxes\s*\}\}/g, () => epIdBoxes(subject ? strVal(subject.ep_id) : data.ep_id));
  // Reserved: EP ID in Bangla digits (e.g. for the photo-id caption).
  out = out.replace(/\{\{\s*ep_id_bn\s*\}\}/g, () => toBn(subject ? strVal(subject.ep_id) : data.ep_id ?? ''));
  out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const raw = valueOf(data, key, subject);
    return opts.bnDigits ? toBn(raw) : raw;
  });
  return out;
}

/** Wrap each EP ID character in its own <span> (Bangla digits). */
function epIdBoxes(epId: string | null | undefined): string {
  if (epId == null || epId === '') return '';
  return [...String(epId)].map((ch) => `<span>${toBn(ch)}</span>`).join('');
}

/** Extract the unique placeholder names used in a template. */
export function listPlaceholders(html: string): string[] {
  const out = new Set<string>();
  const re = /\{\{\s*([\w.]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[1]) out.add(m[1]);
  }
  return [...out];
}