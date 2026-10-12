// ═══════════════════════════════════════════════════════════════
// Dashboard Types — Auto-derived from DashboardController response
// Phase 4B-9
// ═══════════════════════════════════════════════════════════════

export interface EpStats {
  total: number;
  by_status: Record<string, number>;
}

export interface EpicadStats {
  total: number;
}

export interface EcStats {
  total: number;
  by_status: Record<string, number>;
}

export interface CompensationStats {
  total_approved: number;
}

export interface VoucherStats {
  total: number;
  by_status: Record<string, number>;
  total_amount: string;
}

export interface PaymentStats {
  total_count: number;
  total_paid: string;
}

export interface ValidationStats {
  total_eps: number;
  invalid_eps: number;
  valid_eps: number;
  with_epicad: number;
  with_ec: number;
  with_approved_ec: number;
  with_voucher: number;
}

export interface DashboardStats {
  ep: EpStats;
  epicad: EpicadStats;
  ec: EcStats;
  compensation: CompensationStats;
  voucher: VoucherStats;
  payment: PaymentStats;
  validation: ValidationStats;
}
