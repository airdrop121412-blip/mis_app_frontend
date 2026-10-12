// ═══════════════════════════════════════════════════════════════
// EC Types — matches backend Ec, EcLineItem, Compensation models
// ═══════════════════════════════════════════════════════════════

/** EC status lifecycle */
export type EcStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'APPROVED' | 'REJECTED';

/** Compensation categories (ec_line_item.category / compensation.category) */
export type CompensationCategory =
  // 18 official reference categories (docs/CATEGORY-RECONCILIATION-AUDIT.md)
  | 'CfL' | 'CfS' | 'CfT' | 'CfSC' | 'CfFS' | 'RV_STRUCTURE' | 'LDC' | 'DA'
  | 'SRC' | 'HTG' | 'HCG' | 'CfF' | 'CAVHH' | 'AVFHH' | 'CfB' | 'MTG'
  | 'SGfT' | 'GfWL'
  // Legacy coarse codes (still accepted for backward compatibility)
  | 'LAND' | 'CROP' | 'INFRASTRUCTURE' | 'TREE' | 'BUSINESS' | 'WORKER'
  | 'ALLOWANCE' | 'TENANT_GRANT' | 'BUSINESS_GRANT' | 'DISPLACEMENT'
  | 'REHABILITATION' | 'OTHER';

/** The 18 official categories in document order (reference EC/Voucher). */
export const COMPENSATION_CATEGORY_ORDER: string[] = [
  'CfL', 'CfS', 'CfT', 'CfSC', 'CfFS', 'RV_STRUCTURE', 'LDC', 'DA', 'SRC',
  'HTG', 'HCG', 'CfF', 'CAVHH', 'AVFHH', 'CfB', 'MTG', 'SGfT', 'GfWL',
];

/** Friendly labels for categories (English) — official reference labels */
export const COMPENSATION_LABELS: Record<string, string> = {
  // 18 official reference categories
  CfL: 'Compensation for Land (CfL)',
  CfS: 'Compensation for Structure (CfS)',
  CfT: 'Compensation for Trees (CfT)',
  CfSC: 'Compensation for Standing Crops (CfSC)',
  CfFS: 'Compensation for Fish Stock (CfFS)',
  RV_STRUCTURE: 'RV for Structure (Squatters)',
  LDC: 'Land Development Cost (LDC)',
  DA: 'Dislocation Allowance (DA)',
  SRC: 'Stamp duty and Registration Cost (SRC)',
  HTG: 'House Transfer Grant (HTG)',
  HCG: 'House Construction Grant (HCG)',
  CfF: 'Compensation for Tree (CFT)',
  CAVHH: 'Cash Assistance for Vulnerable HH (CAVHH)',
  AVFHH: 'Allowance for Vulnerable and Female HH (AVFHH)',
  CfB: 'Compensation for Business Loss (CfB)',
  MTG: 'Material Transfer Grant (MTG)',
  SGfT: 'Shifting Grant for Tenants (SGfT)',
  GfWL: 'Grant for Wage Loss (GfWL)',
  // Legacy coarse codes
  LAND: 'Compensation for Land',
  CROP: 'Compensation for Crops',
  INFRASTRUCTURE: 'Compensation for Structure',
  TREE: 'Compensation for Tree',
  BUSINESS: 'Compensation for Business',
  WORKER: 'Compensation for Worker',
  ALLOWANCE: 'Allowance',
  TENANT_GRANT: 'Tenant One-time Grant',
  BUSINESS_GRANT: 'Business One-time Grant',
  DISPLACEMENT: 'Displacement Allowance',
  REHABILITATION: 'Rehabilitation Allowance',
  OTHER: 'Other Compensation',
};

/**
 * Map a legacy coarse category code to its canonical 18-category code.
 * Only clear, source-evidenced mappings are included (see
 * docs/CATEGORY-RECONCILIATION-AUDIT.md §3). Ambiguous codes map to
 * themselves (rendered under their own label).
 */
export function canonicalCategory(code: string): string {
  const map: Record<string, string> = {
    LAND: 'CfL',
    CROP: 'CfSC',
    INFRASTRUCTURE: 'CfS',
    TREE: 'CfT',
    BUSINESS: 'CfB',
    WORKER: 'GfWL',
  };
  return map[code] ?? code;
}

/** EC — Damage/Compensation Assessment */
export interface Ec {
  ec_id: number;
  affected_person_id: number;
  epicad_id: number;
  ec_number: string;
  assessment_date: string | null;
  total_assessed_loss: string;
  total_compensation: string;
  status: EcStatus;
  remarks: string | null;
  created_at?: string;
  updated_at?: string;
}

/** EC Line Item — rollup of one assessment category */
export interface EcLineItem {
  ec_line_item_id: number;
  ec_id: number;
  category: string;
  description: string | null;
  assessed_amount: string;
  remarks: string | null;
}

/** Compensation — approved amount per category */
export interface Compensation {
  compensation_id: number;
  ec_id: number;
  category: string;
  assessed_amount: string;
  approved_amount: string;
  status: 'DRAFT' | 'APPROVED' | 'PAID' | 'CANCELLED';
  remarks: string | null;
  /** Backend-computed: sum of voucher_compensation.amount for this compensation. */
  paid_amount?: string;
  /** Backend-computed: approved_amount - paid_amount (never negative). */
  remaining_amount?: string;
  payment_cycle?: 1 | 2;
  payment_cycle_label?: string;
  is_locked?: boolean;
  additional_payment_voucher_id?: number | null;
  locked_at?: string | null;
}

/** Full EC data with nested relations (from file-data endpoint) */
export interface EcFullData extends Ec {
  line_items?: EcLineItem[];
  compensations?: Compensation[];
  vouchers?: Array<Record<string, unknown>>;
}
