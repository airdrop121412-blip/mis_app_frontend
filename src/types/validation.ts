// ═══════════════════════════════════════════════════════════════
// Validation Types — Auto-derived from ValidationController response
// Phase 4B-9
// ═══════════════════════════════════════════════════════════════

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface EpValidationResult {
  ep_id: number;
  ep_id_code: string | null;
  name: string | null;
  issues: ValidationIssue[];
}

export interface ProjectValidationResult {
  project_id: number;
  invalid_count: number;
  items: EpValidationResult[];
}

export interface ReadinessResult {
  ep_id: number;
  ep_id_code: string | null;
  readable: boolean;
  issues: ValidationIssue[];
}

export interface ProjectSummary {
  total_eps: number;
  invalid_eps: number;
  valid_eps: number;
  with_epicad: number;
  with_ec: number;
  with_approved_ec: number;
  with_voucher: number;
}

// ── Correction types ──────────────────────────────────────────

/** Which Correction screen an audit row belongs to. */
export type CorrectionChangeType = 'EDIT' | 'DELETE';

export interface CorrectionRecord {
  correction_audit_id: number;
  project_id: number;
  entity_type: string;
  entity_id: number;
  ep_id: string | null;
  /** Denormalized at write time so the row survives a DELETE correction. */
  hh_id: string | null;
  field_name: string;
  /** EDIT = field correction, DELETE = approved EP removed. */
  change_type: CorrectionChangeType;
  old_value: string | null;
  new_value: string | null;
  financial_impact: boolean;
  correction_reason: string;
  corrected_by: number | null;
  corrected_at: string;
  authorized: boolean;
  authorized_by: number | null;
}

export interface CorrectionActor {
  user_id: number;
  full_name: string;
  username: string;
  email?: string | null;
}

export interface CorrectionHistoryEntry extends CorrectionRecord {
  corrected_by_user?: CorrectionActor | null;
  authorized_by_user?: CorrectionActor | null;
}

/** One APPROVED EP row on the Correction screen. */
export interface CorrectionEpRow {
  affected_person_id: number;
  hh_id: string | null;
  ep_id: string | null;
  name: string;
  father_name: string | null;
  nid_number: string;
  mobile: string;
  mouza: string | null;
  union_name: string | null;
  upazila: string | null;
  district: string | null;
  category_of_loss: string | null;
  status: string;
}

/** One row of the Correction History screen (all entities, one project). */
export interface CorrectionHistoryRow {
  correction_audit_id: number;
  ep_id: string | null;
  hh_id: string | null;
  entity_type: string;
  change_type: CorrectionChangeType;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  cause: string;
  financial_impact: boolean;
  authorized: boolean;
  user_id: number | null;
  /** Email (gmail) when present, otherwise full name / username. */
  user_display: string | null;
  user_email: string | null;
  user_name: string | null;
  user_username: string | null;
  corrected_at: string;
}

export interface CorrectionCreateRequest {
  entity_type: string;
  entity_id: number;
  field_name: string;
  new_value: string | null;
  correction_reason: string;
  authorized?: boolean;
}
