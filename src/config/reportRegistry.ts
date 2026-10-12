// ═══════════════════════════════════════════════════════════════
// Report Registry — Single source of truth for all MIS and SWTPP reports
// Auto-derived from backend ReportType enum + query classes.
// DO NOT hand-edit without cross-checking the backend contract.
// ═══════════════════════════════════════════════════════════════

import type { ColumnType } from '../types/api';

// ── Filter definition ─────────────────────────────────────────
export interface FilterDefinition {
  name: string;
  type: 'integer' | 'string' | 'date';
  label: string;
  options?: string[];
  placeholder?: string;
}

// ── Report configuration ──────────────────────────────────────
export interface ReportConfig {
  slug: string;
  label: string;
  group: ReportGroup;
  columns: { key: string; label: string; type: ColumnType }[];
  filters: FilterDefinition[];
  summaryKeys: string[];
  /** R22 only: summary.entity_totals is an object, not flat scalars */
  hasEntityTotals: boolean;
  /** R16 only: report uses from_date/to_date */
  hasDateRange: boolean;
}

export type ReportGroup =
  | 'EP / Population'
  | 'EC / Assessment'
  | 'Compensation / Allowance'
  | 'Voucher / Payment'
  | 'Geographic / Aggregate'
  | 'Operational'
  | 'SWTPP Legacy';

// ── Shared filter presets ─────────────────────────────────────
const PROJECT_FILTER: FilterDefinition = {
  name: 'project_id',
  type: 'integer',
  label: 'Project',
};
const DISTRICT_FILTER: FilterDefinition = {
  name: 'district_id',
  type: 'integer',
  label: 'District',
};
const UPAZILA_FILTER: FilterDefinition = {
  name: 'upazila_id',
  type: 'integer',
  label: 'Upazila',
};
const STATUS_FILTER: FilterDefinition = {
  name: 'status',
  type: 'string',
  label: 'Status',
};

// ── R01: ep-register ──────────────────────────────────────────
const R01: ReportConfig = {
  slug: 'ep-register',
  label: 'EP Register',
  group: 'EP / Population',
  columns: [
    { key: 'ep_id', label: 'EP ID', type: 'string' },
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'father_name', label: 'Father Name', type: 'string' },
    { key: 'mother_name', label: 'Mother Name', type: 'string' },
    { key: 'nid_number', label: 'NID Number', type: 'string' },
    { key: 'mobile', label: 'Mobile', type: 'string' },
    { key: 'gender', label: 'Gender', type: 'string' },
    { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
    { key: 'religion', label: 'Religion', type: 'string' },
    { key: 'occupation', label: 'Occupation', type: 'string' },
    { key: 'district', label: 'District', type: 'string' },
    { key: 'upazila', label: 'Upazila', type: 'string' },
    { key: 'land_status', label: 'Land Status', type: 'string' },
    { key: 'rc_type', label: 'RC Type', type: 'string' },
    { key: 'monthly_income', label: 'Monthly Income', type: 'money' },
    { key: 'monthly_expense', label: 'Monthly Expense', type: 'money' },
    { key: 'is_household_head', label: 'Household Head', type: 'boolean' },
    { key: 'status', label: 'Status', type: 'string' },
  ],
  filters: [PROJECT_FILTER, DISTRICT_FILTER, UPAZILA_FILTER, STATUS_FILTER],
  summaryKeys: ['total_count'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R02: ep-status-summary ────────────────────────────────────
const R02: ReportConfig = {
  slug: 'ep-status-summary',
  label: 'EP Status Summary',
  group: 'EP / Population',
  columns: [
    { key: 'status', label: 'Status', type: 'string' },
    { key: 'ep_count', label: 'EP Count', type: 'integer' },
    { key: 'percentage', label: 'Percentage', type: 'percentage' },
  ],
  filters: [PROJECT_FILTER, DISTRICT_FILTER, UPAZILA_FILTER],
  summaryKeys: ['total_ep'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R03: ep-demographics ──────────────────────────────────────
const R03: ReportConfig = {
  slug: 'ep-demographics',
  label: 'EP Demographic Summary',
  group: 'EP / Population',
  columns: [
    { key: 'dimension', label: 'Dimension', type: 'string' },
    { key: 'dimension_value', label: 'Value', type: 'string' },
    { key: 'ep_count', label: 'EP Count', type: 'integer' },
  ],
  filters: [PROJECT_FILTER, DISTRICT_FILTER, UPAZILA_FILTER, STATUS_FILTER],
  summaryKeys: ['total_ep'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R04: family-register ──────────────────────────────────────
const R04: ReportConfig = {
  slug: 'family-register',
  label: 'Family Member Register',
  group: 'EP / Population',
  columns: [
    { key: 'family_member_id', label: 'Member ID', type: 'integer' },
    { key: 'ep_id', label: 'EP ID', type: 'string' },
    { key: 'ep_name', label: 'EP Name', type: 'string' },
    { key: 'relationship', label: 'Relationship', type: 'string' },
    { key: 'gender', label: 'Gender', type: 'string' },
    { key: 'age', label: 'Age', type: 'integer' },
    { key: 'occupation', label: 'Occupation', type: 'string' },
    { key: 'is_dependent', label: 'Dependent', type: 'boolean' },
  ],
  filters: [PROJECT_FILTER, DISTRICT_FILTER, UPAZILA_FILTER, STATUS_FILTER],
  summaryKeys: ['total_members'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R05: epicad-list ──────────────────────────────────────────
const R05: ReportConfig = {
  slug: 'epicad-list',
  label: 'EPICAD List',
  group: 'EP / Population',
  columns: [
    { key: 'epicad_id', label: 'EPICAD ID', type: 'integer' },
    { key: 'ep_id', label: 'EP ID', type: 'string' },
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'nid_number', label: 'NID Number', type: 'string' },
    { key: 'mobile', label: 'Mobile', type: 'string' },
    { key: 'issue_date', label: 'Issue Date', type: 'date' },
    { key: 'print_status', label: 'Print Status', type: 'string' },
  ],
  filters: [
    PROJECT_FILTER,
    DISTRICT_FILTER,
    UPAZILA_FILTER,
    {
      name: 'print_status',
      type: 'string',
      label: 'Print Status',
      options: ['NOT_PRINTED', 'PRINTED', 'REPRINTED'],
    },
  ],
  summaryKeys: ['total_count'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R06: ec-register ──────────────────────────────────────────
const R06: ReportConfig = {
  slug: 'ec-register',
  label: 'EC Register',
  group: 'EC / Assessment',
  columns: [
    { key: 'ec_id', label: 'EC ID', type: 'integer' },
    { key: 'ec_number', label: 'EC Number', type: 'string' },
    { key: 'ep_id', label: 'EP ID', type: 'string' },
    { key: 'ep_name', label: 'EP Name', type: 'string' },
    { key: 'assessment_date', label: 'Assessment Date', type: 'date' },
    { key: 'total_assessed_loss', label: 'Total Assessed', type: 'money' },
    { key: 'total_compensation', label: 'Total Compensation', type: 'money' },
    { key: 'status', label: 'Status', type: 'string' },
  ],
  filters: [PROJECT_FILTER, DISTRICT_FILTER, UPAZILA_FILTER, STATUS_FILTER],
  summaryKeys: ['total_ec', 'total_assessed', 'total_compensation'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R07: ec-status-summary ────────────────────────────────────
const R07: ReportConfig = {
  slug: 'ec-status-summary',
  label: 'EC Status Summary',
  group: 'EC / Assessment',
  columns: [
    { key: 'status', label: 'Status', type: 'string' },
    { key: 'ec_count', label: 'EC Count', type: 'integer' },
    { key: 'percentage', label: 'Percentage', type: 'percentage' },
    { key: 'total_assessed', label: 'Total Assessed', type: 'money' },
    { key: 'total_compensation', label: 'Total Compensation', type: 'money' },
  ],
  filters: [PROJECT_FILTER, DISTRICT_FILTER, UPAZILA_FILTER],
  summaryKeys: ['total_ec'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R08: assessment-summary ───────────────────────────────────
const R08: ReportConfig = {
  slug: 'assessment-summary',
  label: 'Assessment Summary by Category',
  group: 'EC / Assessment',
  columns: [
    { key: 'category', label: 'Category', type: 'string' },
    { key: 'ec_count', label: 'EC Count', type: 'integer' },
    { key: 'ep_count', label: 'EP Count', type: 'integer' },
    { key: 'total_assessed', label: 'Total Assessed', type: 'money' },
    { key: 'line_count', label: 'Line Items', type: 'integer' },
    { key: 'percentage', label: 'Percentage', type: 'percentage' },
  ],
  filters: [PROJECT_FILTER, DISTRICT_FILTER, UPAZILA_FILTER, STATUS_FILTER],
  summaryKeys: ['total_assessed', 'total_categories'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R09: land-assessment ──────────────────────────────────────
const R09: ReportConfig = {
  slug: 'land-assessment',
  label: 'Land Assessment Detail',
  group: 'EC / Assessment',
  columns: [
    { key: 'land_assessment_id', label: 'Assessment ID', type: 'integer' },
    { key: 'ep_id', label: 'EP ID', type: 'string' },
    { key: 'ep_name', label: 'EP Name', type: 'string' },
    { key: 'land_type', label: 'Land Type', type: 'string' },
    { key: 'land_area', label: 'Land Area', type: 'number' },
    { key: 'land_area_unit', label: 'Area Unit', type: 'string' },
    { key: 'damage_type', label: 'Damage Type', type: 'string' },
    { key: 'affected_area', label: 'Affected Area', type: 'number' },
    { key: 'affected_area_unit', label: 'Affected Unit', type: 'string' },
    { key: 'rate_per_unit', label: 'Rate Per Unit', type: 'money' },
    { key: 'assessed_loss', label: 'Assessed Loss', type: 'money' },
  ],
  filters: [
    PROJECT_FILTER,
    DISTRICT_FILTER,
    UPAZILA_FILTER,
    { name: 'land_type_id', type: 'integer', label: 'Land Type' },
  ],
  summaryKeys: ['total_assessments', 'total_assessed'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R10: crop-assessment ──────────────────────────────────────
const R10: ReportConfig = {
  slug: 'crop-assessment',
  label: 'Crop Assessment Detail',
  group: 'EC / Assessment',
  columns: [
    { key: 'crop_assessment_id', label: 'Assessment ID', type: 'integer' },
    { key: 'ep_id', label: 'EP ID', type: 'string' },
    { key: 'ep_name', label: 'EP Name', type: 'string' },
    { key: 'land_type', label: 'Land Type', type: 'string' },
    { key: 'crop_type', label: 'Crop Type', type: 'string' },
    { key: 'season', label: 'Season', type: 'string' },
    { key: 'cultivated_area', label: 'Cultivated Area', type: 'number' },
    { key: 'area_unit', label: 'Area Unit', type: 'string' },
    { key: 'damage_percentage', label: 'Damage %', type: 'number' },
    { key: 'rate_per_unit', label: 'Rate Per Unit', type: 'money' },
    { key: 'assessed_loss', label: 'Assessed Loss', type: 'money' },
  ],
  filters: [
    PROJECT_FILTER,
    DISTRICT_FILTER,
    UPAZILA_FILTER,
    { name: 'crop_type_id', type: 'integer', label: 'Crop Type' },
    { name: 'season_id', type: 'integer', label: 'Season' },
  ],
  summaryKeys: ['total_assessments', 'total_assessed'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R11: compensation-summary ─────────────────────────────────
const R11: ReportConfig = {
  slug: 'compensation-summary',
  label: 'Compensation Summary',
  group: 'Compensation / Allowance',
  columns: [
    { key: 'category', label: 'Category', type: 'string' },
    { key: 'compensation_count', label: 'Compensation Count', type: 'integer' },
    { key: 'total_assessed', label: 'Total Assessed', type: 'money' },
    { key: 'total_approved', label: 'Total Approved', type: 'money' },
    { key: 'percentage', label: 'Percentage', type: 'percentage' },
  ],
  filters: [PROJECT_FILTER, DISTRICT_FILTER, UPAZILA_FILTER, STATUS_FILTER],
  summaryKeys: ['total_compensations', 'total_approved'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R12: allowance-list ───────────────────────────────────────
const R12: ReportConfig = {
  slug: 'allowance-list',
  label: 'Allowance List',
  group: 'Compensation / Allowance',
  columns: [
    { key: 'allowance_id', label: 'Allowance ID', type: 'integer' },
    { key: 'ep_id', label: 'EP ID', type: 'string' },
    { key: 'ep_name', label: 'EP Name', type: 'string' },
    { key: 'rule_code', label: 'Rule Code', type: 'string' },
    { key: 'rule_type', label: 'Rule Type', type: 'string' },
    { key: 'is_eligible', label: 'Eligible', type: 'boolean' },
    { key: 'computed_annual_income', label: 'Computed Annual Income', type: 'money' },
    { key: 'grant_amount', label: 'Grant Amount', type: 'money' },
    { key: 'status', label: 'Status', type: 'string' },
  ],
  filters: [PROJECT_FILTER, DISTRICT_FILTER, UPAZILA_FILTER, STATUS_FILTER],
  summaryKeys: ['total_count'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R13: allowance-summary ────────────────────────────────────
const R13: ReportConfig = {
  slug: 'allowance-summary',
  label: 'Allowance Summary',
  group: 'Compensation / Allowance',
  columns: [
    { key: 'status', label: 'Status', type: 'string' },
    { key: 'allowance_count', label: 'Allowance Count', type: 'integer' },
    { key: 'total_grant', label: 'Total Grant', type: 'money' },
    { key: 'percentage', label: 'Percentage', type: 'percentage' },
  ],
  filters: [PROJECT_FILTER, DISTRICT_FILTER, UPAZILA_FILTER],
  summaryKeys: ['total_allowances', 'total_grant'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R14: vulnerability-report ─────────────────────────────────
const R14: ReportConfig = {
  slug: 'vulnerability-report',
  label: 'Vulnerability Report',
  group: 'Compensation / Allowance',
  columns: [
    { key: 'rule_code', label: 'Rule Code', type: 'string' },
    { key: 'rule_type', label: 'Rule Type', type: 'string' },
    { key: 'annual_income_limit', label: 'Annual Income Limit', type: 'money' },
    { key: 'rule_grant_amount', label: 'Rule Grant Amount', type: 'money' },
    { key: 'is_active', label: 'Active', type: 'boolean' },
    { key: 'evaluated_count', label: 'Evaluated', type: 'integer' },
    { key: 'eligible_count', label: 'Eligible', type: 'integer' },
    { key: 'ineligible_count', label: 'Ineligible', type: 'integer' },
    { key: 'total_grants', label: 'Total Grants', type: 'money' },
  ],
  filters: [PROJECT_FILTER, DISTRICT_FILTER, UPAZILA_FILTER],
  summaryKeys: ['total_rules'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R15: voucher-list ─────────────────────────────────────────
const R15: ReportConfig = {
  slug: 'voucher-list',
  label: 'Voucher List',
  group: 'Voucher / Payment',
  columns: [
    { key: 'voucher_id', label: 'Voucher ID', type: 'integer' },
    { key: 'voucher_number', label: 'Voucher Number', type: 'string' },
    { key: 'voucher_date', label: 'Voucher Date', type: 'date' },
    { key: 'approved_amount', label: 'Approved Amount', type: 'money' },
    { key: 'payment_status', label: 'Payment Status', type: 'string' },
    { key: 'ec_number', label: 'EC Number', type: 'string' },
    { key: 'ep_id', label: 'EP ID', type: 'string' },
    { key: 'ep_name', label: 'EP Name', type: 'string' },
    { key: 'prepared_by_name', label: 'Prepared By', type: 'string' },
    { key: 'verified_by_name', label: 'Verified By', type: 'string' },
    { key: 'approved_by_name', label: 'Approved By', type: 'string' },
  ],
  filters: [
    PROJECT_FILTER,
    DISTRICT_FILTER,
    UPAZILA_FILTER,
    {
      name: 'payment_status',
      type: 'string',
      label: 'Payment Status',
      options: ['PENDING', 'PARTIAL', 'PAID'],
    },
  ],
  summaryKeys: ['total_vouchers', 'total_amount'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R16: payment-summary ──────────────────────────────────────
const R16: ReportConfig = {
  slug: 'payment-summary',
  label: 'Payment Summary',
  group: 'Voucher / Payment',
  columns: [
    { key: 'payment_month', label: 'Payment Month', type: 'string' },
    { key: 'payment_count', label: 'Payment Count', type: 'integer' },
    { key: 'total_amount', label: 'Total Amount', type: 'money' },
    { key: 'percentage', label: 'Percentage', type: 'percentage' },
  ],
  filters: [
    PROJECT_FILTER,
    DISTRICT_FILTER,
    UPAZILA_FILTER,
    { name: 'from_date', type: 'date', label: 'From Date' },
    { name: 'to_date', type: 'date', label: 'To Date' },
  ],
  summaryKeys: ['total_payments', 'total_amount'],
  hasEntityTotals: false,
  hasDateRange: true,
};

// ── R17: outstanding ──────────────────────────────────────────
const R17: ReportConfig = {
  slug: 'outstanding',
  label: 'Outstanding Amounts',
  group: 'Voucher / Payment',
  columns: [
    { key: 'voucher_id', label: 'Voucher ID', type: 'integer' },
    { key: 'voucher_number', label: 'Voucher Number', type: 'string' },
    { key: 'voucher_date', label: 'Voucher Date', type: 'date' },
    { key: 'approved_amount', label: 'Approved Amount', type: 'money' },
    { key: 'total_paid', label: 'Total Paid', type: 'money' },
    { key: 'outstanding', label: 'Outstanding', type: 'money' },
    { key: 'payment_status', label: 'Payment Status', type: 'string' },
    { key: 'ec_number', label: 'EC Number', type: 'string' },
    { key: 'ep_id', label: 'EP ID', type: 'string' },
    { key: 'ep_name', label: 'EP Name', type: 'string' },
  ],
  filters: [
    PROJECT_FILTER,
    DISTRICT_FILTER,
    UPAZILA_FILTER,
    {
      name: 'outstanding_only',
      type: 'string',
      label: 'Outstanding Only',
      options: ['0', '1'],
    },
  ],
  summaryKeys: ['total_vouchers', 'total_outstanding'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R18: payment-method-breakdown ─────────────────────────────
const R18: ReportConfig = {
  slug: 'payment-method-breakdown',
  label: 'Payment Method Breakdown',
  group: 'Voucher / Payment',
  columns: [
    { key: 'payment_method', label: 'Payment Method', type: 'string' },
    { key: 'payment_count', label: 'Payment Count', type: 'integer' },
    { key: 'total_amount', label: 'Total Amount', type: 'money' },
    { key: 'percentage', label: 'Percentage', type: 'percentage' },
  ],
  filters: [PROJECT_FILTER, DISTRICT_FILTER, UPAZILA_FILTER],
  summaryKeys: ['total_payments', 'total_amount'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R19: district-summary ─────────────────────────────────────
const R19: ReportConfig = {
  slug: 'district-summary',
  label: 'District Summary',
  group: 'Geographic / Aggregate',
  columns: [
    { key: 'district_id', label: 'District ID', type: 'integer' },
    { key: 'district_name', label: 'District', type: 'string' },
    { key: 'district_code', label: 'District Code', type: 'string' },
    { key: 'ep_count', label: 'EP Count', type: 'integer' },
    { key: 'ec_count', label: 'EC Count', type: 'integer' },
    { key: 'total_assessed', label: 'Total Assessed', type: 'money' },
    { key: 'total_compensation', label: 'Total Compensation', type: 'money' },
    { key: 'allowance_count', label: 'Allowance Count', type: 'integer' },
    { key: 'total_grant', label: 'Total Grant', type: 'money' },
  ],
  filters: [PROJECT_FILTER, DISTRICT_FILTER],
  summaryKeys: ['total_districts', 'total_eps'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R20: upazila-summary ──────────────────────────────────────
const R20: ReportConfig = {
  slug: 'upazila-summary',
  label: 'Upazila Summary',
  group: 'Geographic / Aggregate',
  columns: [
    { key: 'upazila_id', label: 'Upazila ID', type: 'integer' },
    { key: 'upazila_name', label: 'Upazila', type: 'string' },
    { key: 'upazila_code', label: 'Upazila Code', type: 'string' },
    { key: 'district_name', label: 'District', type: 'string' },
    { key: 'ep_count', label: 'EP Count', type: 'integer' },
    { key: 'ec_count', label: 'EC Count', type: 'integer' },
    { key: 'total_assessed', label: 'Total Assessed', type: 'money' },
    { key: 'total_compensation', label: 'Total Compensation', type: 'money' },
    { key: 'allowance_count', label: 'Allowance Count', type: 'integer' },
    { key: 'total_grant', label: 'Total Grant', type: 'money' },
  ],
  filters: [PROJECT_FILTER, DISTRICT_FILTER, UPAZILA_FILTER],
  summaryKeys: ['total_upazilas', 'total_eps'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R21: project-summary ──────────────────────────────────────
const R21: ReportConfig = {
  slug: 'project-summary',
  label: 'Project Summary',
  group: 'Geographic / Aggregate',
  columns: [
    { key: 'project_id', label: 'Project ID', type: 'integer' },
    { key: 'project_code', label: 'Project Code', type: 'string' },
    { key: 'project_name', label: 'Project Name', type: 'string' },
    { key: 'ep_count', label: 'EP Count', type: 'integer' },
    { key: 'ec_count', label: 'EC Count', type: 'integer' },
    { key: 'total_assessed', label: 'Total Assessed', type: 'money' },
    { key: 'total_compensation', label: 'Total Compensation', type: 'money' },
    { key: 'allowance_count', label: 'Allowance Count', type: 'integer' },
    { key: 'total_grant', label: 'Total Grant', type: 'money' },
    { key: 'voucher_count', label: 'Voucher Count', type: 'integer' },
    { key: 'total_paid', label: 'Total Paid', type: 'money' },
  ],
  filters: [PROJECT_FILTER],
  summaryKeys: ['total_projects', 'total_eps'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── R22: workflow-status ──────────────────────────────────────
const R22: ReportConfig = {
  slug: 'workflow-status',
  label: 'Workflow Status Report',
  group: 'Operational',
  columns: [
    { key: 'entity_type', label: 'Entity Type', type: 'string' },
    { key: 'status', label: 'Status', type: 'string' },
    { key: 'count', label: 'Count', type: 'integer' },
  ],
  filters: [PROJECT_FILTER, DISTRICT_FILTER, UPAZILA_FILTER],
  summaryKeys: [],
  hasEntityTotals: true,
  hasDateRange: false,
};

// ── R23: epicad-print-status ──────────────────────────────────
const R23: ReportConfig = {
  slug: 'epicad-print-status',
  label: 'EPICAD Print Status',
  group: 'Operational',
  columns: [
    { key: 'print_status', label: 'Print Status', type: 'string' },
    { key: 'print_count', label: 'Print Count', type: 'integer' },
    { key: 'percentage', label: 'Percentage', type: 'percentage' },
  ],
  filters: [PROJECT_FILTER, DISTRICT_FILTER, UPAZILA_FILTER],
  summaryKeys: ['total_epicads'],
  hasEntityTotals: false,
  hasDateRange: false,
};

// ── SWTPP legacy-compatible registers ─────────────────────────
const SWTPP_EP_COMPENSATION: ReportConfig = {
  slug: 'swtpp-ep-compensation',
  label: 'SWTPP EP Compensation Register',
  group: 'SWTPP Legacy',
  columns: [
    { key: 'ep_id', label: 'EP ID', type: 'string' },
    { key: 'name', label: 'EP Name', type: 'string' },
    { key: 'father_name', label: 'Father Name', type: 'string' },
    { key: 'mother_name', label: 'Mother Name', type: 'string' },
    { key: 'total_family_member', label: 'Total Family', type: 'integer' },
    { key: 'male_member', label: 'Male', type: 'integer' },
    { key: 'female_member', label: 'Female', type: 'integer' },
    { key: 'total_tenant', label: 'Total Tenant', type: 'integer' },
    { key: 'land_compensation', label: 'Land Compensation', type: 'money' },
    { key: 'tree_compensation', label: 'Tree Compensation', type: 'money' },
    { key: 'structure_compensation', label: 'Structure Compensation', type: 'money' },
    { key: 'wage_compensation', label: 'Wage Compensation', type: 'money' },
    { key: 'stamp_duty', label: 'Stamp Duty', type: 'money' },
    { key: 'calculated_dc_compensation', label: 'Calculated DC Compensation', type: 'money' },
    { key: 'legacy_dc_compensation', label: 'Legacy DC Compensation', type: 'money' },
    { key: 'reconciliation_difference', label: 'Difference', type: 'money' },
    { key: 'cheque_no', label: 'Cheque No', type: 'string' },
    { key: 'cheque_date', label: 'Cheque Date', type: 'date' },
    { key: 'status', label: 'MIS Status', type: 'string' },
  ],
  filters: [PROJECT_FILTER, DISTRICT_FILTER, UPAZILA_FILTER, STATUS_FILTER],
  summaryKeys: ['total_eps', 'total_calculated_compensation'],
  hasEntityTotals: false,
  hasDateRange: false,
};

const SWTPP_STRUCTURE: ReportConfig = {
  slug: 'swtpp-structure-register',
  label: 'SWTPP Structure Register',
  group: 'SWTPP Legacy',
  columns: [
    { key: 'infrastructure_id', label: 'Structure ID', type: 'integer' },
    { key: 'ep_id', label: 'EP ID', type: 'string' },
    { key: 'ep_name', label: 'EP Name', type: 'string' },
    { key: 'structure_type', label: 'Structure Type', type: 'string' },
    { key: 'length', label: 'Length', type: 'number' },
    { key: 'width', label: 'Width', type: 'number' },
    { key: 'area_sqft', label: 'Area', type: 'number' },
    { key: 'damage_percentage', label: 'Damage %', type: 'percentage' },
    { key: 'rate_per_sqft', label: 'Structure Rate', type: 'money' },
    { key: 'assessed_loss', label: 'DC Compensation', type: 'money' },
  ],
  filters: [PROJECT_FILTER, DISTRICT_FILTER, UPAZILA_FILTER],
  summaryKeys: ['total_structures', 'total_compensation'],
  hasEntityTotals: false,
  hasDateRange: false,
};

const SWTPP_PAYMENT: ReportConfig = {
  slug: 'swtpp-payment-register',
  label: 'SWTPP Payment Register',
  group: 'SWTPP Legacy',
  columns: [
    { key: 'payment_id', label: 'Payment ID', type: 'integer' },
    { key: 'ep_id', label: 'EP ID', type: 'string' },
    { key: 'ep_name', label: 'EP Name', type: 'string' },
    { key: 'voucher_number', label: 'Voucher No', type: 'string' },
    { key: 'cheque_no', label: 'Cheque No', type: 'string' },
    { key: 'cheque_date', label: 'Cheque Date', type: 'date' },
    { key: 'payment_method', label: 'Payment Method', type: 'string' },
    { key: 'amount', label: 'Paid Amount', type: 'money' },
    { key: 'payment_status', label: 'Payment Status', type: 'string' },
  ],
  filters: [PROJECT_FILTER, DISTRICT_FILTER, UPAZILA_FILTER],
  summaryKeys: ['total_payments', 'total_paid'],
  hasEntityTotals: false,
  hasDateRange: true,
};

// ═══════════════════════════════════════════════════════════════
// Registry — ordered by enum case (R01–R23)
// ═══════════════════════════════════════════════════════════════
export const REPORT_REGISTRY: ReportConfig[] = [
  R01, R02, R03, R04, R05,
  R06, R07, R08, R09, R10,
  R11, R12, R13, R14,
  R15, R16, R17, R18,
  R19, R20, R21,
  R22, R23,
  SWTPP_EP_COMPENSATION, SWTPP_STRUCTURE, SWTPP_PAYMENT,
];

/** Lookup by slug — the primary access pattern */
export const REPORT_BY_SLUG: Record<string, ReportConfig> = Object.fromEntries(
  REPORT_REGISTRY.map((r) => [r.slug, r]),
);

/** All distinct groups for sidebar / nav */
export const REPORT_GROUPS: ReportGroup[] = [
  'EP / Population',
  'EC / Assessment',
  'Compensation / Allowance',
  'Voucher / Payment',
  'Geographic / Aggregate',
  'Operational',
  'SWTPP Legacy',
];

/** Get all reports in a given group */
export function reportsByGroup(group: ReportGroup): ReportConfig[] {
  return REPORT_REGISTRY.filter((r) => r.group === group);
}
