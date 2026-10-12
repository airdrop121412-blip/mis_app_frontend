// ═══════════════════════════════════════════════════════════════
// API Contract Types — Auto-derived from backend integration contract
// Source: docs/FRONTEND-INTEGRATION-CONTRACT.md
// DO NOT hand-edit without cross-checking the backend contract.
// ═══════════════════════════════════════════════════════════════

// ── Column type taxonomy ──────────────────────────────────────
export type ColumnType =
  | 'string'
  | 'integer'
  | 'number'
  | 'money'
  | 'date'
  | 'boolean'
  | 'percentage';

// ── Column metadata (from data.columns[]) ─────────────────────
export interface ReportColumn {
  key: string;
  label: string;
  type: ColumnType;
}

// ── Response envelope (ApiResponse wrapper) ───────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  meta: ApiMeta | null;
  errors: { code: string[] } | null;
}

export interface ApiMeta {
  type: string;
  filters_applied: Record<string, unknown>;
  total_rows: number;
  [key: string]: unknown;
}

// ── Report dataset (data block inside envelope) ───────────────
export interface ReportDataset {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  summary: Record<string, unknown>;
}

// ── Error response helpers ────────────────────────────────────
export interface ApiError {
  message: string;
  code: string;
  status: number;
}

// ── Auth types ────────────────────────────────────────────────
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: {
    user_id: number;
    full_name: string;
    username: string;
    is_active: boolean;
    roles?: string[];
  };
  token: string;
}

// ── Filter parameter types ────────────────────────────────────
export interface ReportFilters {
  project_id?: number;
  district_id?: number;
  upazila_id?: number;
  status?: string;
  from_date?: string;
  to_date?: string;
  category?: string;
  rule_code?: string;
  payment_method_id?: number;
  print_status?: string;
  per_page?: number;
  format?: string;
  // Report-specific filters
  land_type_id?: number;
  crop_type_id?: number;
  season_id?: number;
  payment_status?: string;
  outstanding_only?: string;
}
