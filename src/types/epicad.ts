// ═══════════════════════════════════════════════════════════════
// Epicad Types — EPICAD card + design templates
// Source: backend epicad + epicad_design tables
// ═══════════════════════════════════════════════════════════════

// ── EPICAD status lifecycle (per-EP card record) ───────────────
export type PrintStatus = 'NOT_PRINTED' | 'PRINTED' | 'REPRINTED';

export interface Epicad {
  epicad_id: number;
  affected_person_id: number;
  issue_date: string | null;
  print_status: PrintStatus;
  remarks: string | null;
  created_at: string | null;
}

// ── Fields available to place on a card (visual builder) ───────
export type EpicadFieldId =
  | 'ep_id'
  | 'name'
  | 'father_name'
  | 'mother_name'
  | 'gender'
  | 'date_of_birth'
  | 'age'
  | 'nid_number'
  | 'mobile'
  | 'occupation'
  | 'district'
  | 'upazila'
  | 'union_name'
  | 'mouza'
  | 'land_status'
  | 'yearly_income'
  | 'monthly_income'
  | 'project'
  | 'category_of_loss'
  | 'ownership'
  | 'photo'
  | 'qrcode'
  | 'signature'
  | 'text';

// ── One placed element on the card ─────────────────────────────
export interface EpicadElement {
  id: string;
  field: EpicadFieldId;
  label: string;         // override label ('' uses default)
  x: number;             // % of card width
  y: number;             // % of card height
  w: number;             // % of card width
  h: number;             // % of card height
  fontSize: number;      // px (relative to design grid)
  color: string;
  bold: boolean;
  align: 'left' | 'center' | 'right';
  text?: string;         // static text for 'text' field
}

// ── Full design layout (layout_json) ───────────────────────────
export interface EpicadLayout {
  version: 1;
  elements: EpicadElement[];
}

// ── Frontend+backend design record ─────────────────────────────
export interface EpicadDesign {
  epicad_design_id: number;
  project_id: number;
  name: string | null;
  orientation: 'portrait' | 'landscape';
  page_size: string;
  layout_json: string | null;
  background_url: string | null;
  css: string | null;
  html_template: string | null;
  docx_orig_filename: string | null;
  is_active: boolean;
  created_by: number | null;
  updated_by: number | null;
  updated_at: string | null;
}

export interface EpicadDesignInput {
  project_id: number;
  name?: string | null;
  orientation?: 'portrait' | 'landscape';
  page_size?: string;
  layout_json?: string | null;
  background_url?: string | null;
  css?: string | null;
  html_template?: string | null;
  is_active?: boolean;
}