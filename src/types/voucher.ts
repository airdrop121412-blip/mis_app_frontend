// ═══════════════════════════════════════════════════════════════
// Voucher Types — matches backend Voucher, VoucherCompensation,
// Payment models (VOUCHER-SPEC.md §2)
// ═══════════════════════════════════════════════════════════════

/** Voucher payment status lifecycle */
export type VoucherStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED';

/** Voucher — payment batch per EC */
export interface Voucher {
  voucher_id: number;
  ec_id: number;
  voucher_number: string;
  voucher_date: string | null;
  approved_amount: string;
  payment_status: VoucherStatus;
  prepared_by: number | null;
  verified_by: number | null;
  approved_by: number | null;
  remarks: string | null;
  created_at?: string;
  updated_at?: string;
  /** Backend-derived: true when this voucher carries second-payment (cycle-2)
   * compensation lines. Never derived from the EP's PAID status alone. */
  is_additional?: boolean;
}

/** One row of the additional-payment worklist (PAID EPs with new loss data). */
export interface AdditionalPendingItem {
  affected_person_id: number;
  ep_id: string | null;
  name: string;
  status: string;
  estimated_additional_amount: string;
  has_active_voucher: boolean;
  active_voucher_number: string | null;
  remark: string;
}

/** VoucherCompensation — which compensation lines are in a voucher */
export interface VoucherCompensation {
  voucher_compensation_id: number;
  voucher_id: number;
  compensation_id: number;
  amount: string;
  remarks: string | null;
  compensation?: {
    compensation_id: number;
    ec_id: number;
    category: string;
    assessed_amount: string;
    approved_amount: string;
    status: string;
    remarks: string | null;
    /** Backend-decorated (additional_payment_record): 1 = original, 2 = additional. */
    payment_cycle?: 1 | 2;
    payment_cycle_label?: string;
    is_locked?: boolean;
    additional_payment_voucher_id?: number | null;
    locked_at?: string | null;
  };
}

/** Payment — actual disbursement against a voucher */
export interface Payment {
  payment_id: number;
  voucher_id: number;
  payment_method_id: number;
  amount: string;
  payment_reference: string | null;
  payment_date: string | null;
  remarks: string | null;
  created_at?: string;
  updated_at?: string;
  payment_method?: {
    payment_method_id: number;
    code: string;
    name: string;
  };
}

/** Full voucher with nested relations (from show endpoint) */
export interface VoucherFullData extends Voucher {
  voucher_compensations?: VoucherCompensation[];
  payments?: Payment[];
}

/** Payment method master item */
export interface PaymentMethod {
  payment_method_id: number;
  code: string;
  name: string;
  is_active: boolean;
  remarks: string | null;
}

/** Payment status display config */
export const VOUCHER_STATUS_LABEL: Record<VoucherStatus, string> = {
  PENDING: 'Pending',
  PARTIAL: 'Partially Paid',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
};

export const VOUCHER_STATUS_STYLE: Record<VoucherStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};