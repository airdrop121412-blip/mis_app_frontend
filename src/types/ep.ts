// ═══════════════════════════════════════════════════════════════
// EP Types — Auto-derived from AffectedPerson model + resource
// Source: backend app/Models/AffectedPerson.php + AffectedPersonResource.php
// DO NOT hand-edit without cross-checking the backend contract.
// ═══════════════════════════════════════════════════════════════

// ── EP (Affected Person) ─────────────────────────────────────
export interface AffectedPerson {
    affected_person_id: number;
    project_id: number;
    ep_id: string | null;
    hh_id: string | null;
    name: string;
    father_name: string | null;
    mother_name: string | null;
    spouse_name: string | null;
    nid_number: string;
    mobile: string;
    gender_id: number;
    gender?: string;          // resolved name from eager-loaded relationship
    date_of_birth: string | null;
    age: number | null;
    religion_id: number | null;
    religion?: string;
    occupation_id: number | null;
    occupation?: string;
    occupation_other?: string | null;
    district_id: number;
    district?: string;
    upazila_id: number;
    upazila?: string;
    phase: string | null;
    mouza: string | null;
    union_name: string | null;
    category_of_loss: string | null;
    ownership: string | null;
    dc_compensation: string | null;   // decimal string
    cheque_no: string | null;
    cheque_date: string | null;
    dc_tree_compensation: string | null;   // decimal string
    dc_tree_cheque_no: string | null;
    dc_tree_cheque_date: string | null;
    yearly_income: string | null;     // decimal string
    is_disabled: boolean;
    is_landless: boolean;
    is_tribal: boolean;
    has_business_loss: boolean;
    shifting_materials: string | null;
    nature_of_displacement: string | null;
    displacement_status: string | null;
    is_tenant: boolean;
    total_tenant: number | null;
    stamp_duty: string | null;        // decimal string
    no_displacement: boolean;
    land_status_id: number;
    land_status?: string;
    rc_type_id: number;
    rc_type?: string;
    monthly_income: string;   // decimal string
    monthly_expense: string;  // decimal string
    gps_latitude: string | null;
    gps_longitude: string | null;
    location_accuracy: string | null;
    location_source_id: number | null;
    is_household_head: boolean;
    total_family_member: number | null;
    male_member: number | null;
    female_member: number | null;
    remarks: string | null;
    status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'APPROVED' | 'PAID';
    card_kind?: 'ep' | 'tenant' | 'worker';
    card_subject_id?: number | null;
    card_subject_ep_id?: string | null;
    card_subject_name?: string | null;
    ec_status?: string | null;    // resolved EC status (list endpoint with eager-loaded ec)
    ec_number?: string | null;    // resolved EC number
}

export interface EpCreateInput {
    project_id: number;
    hh_id?: string;
    name: string;
    father_name?: string;
    mother_name?: string;
    spouse_name?: string;
    nid_number: string;
    mobile: string;
    gender_id: number;
    gender_other?: string | null;
    date_of_birth?: string;
    age?: number;
    religion_id?: number;
    religion_other?: string | null;
    occupation_id?: number;
    occupation_other?: string | null;
    district_id: number;
    upazila_id: number;
    phase?: string | null;
    mouza?: string;
    union_name?: string;
    category_of_loss?: string;
    ownership?: string;
    dc_compensation?: number;
    cheque_no?: string;
    cheque_date?: string;
    dc_tree_compensation?: number;
    dc_tree_cheque_no?: string;
    dc_tree_cheque_date?: string;
    yearly_income?: number;
    is_disabled?: boolean;
    is_landless?: boolean;
    is_tribal?: boolean;
    has_business_loss?: boolean;
    shifting_materials?: string;
    nature_of_displacement?: string;
    displacement_status?: string;
    is_tenant?: boolean;
    total_tenant?: number;
    stamp_duty?: number;
    no_displacement?: boolean;
    land_status_id: number;
    rc_type_id: number;
    monthly_income?: number;
    monthly_expense?: number;
    gps_latitude?: number;
    gps_longitude?: number;
    location_accuracy?: number;
    location_source_id?: number;
    is_household_head?: boolean;
    total_family_member?: number;
    male_member?: number;
    female_member?: number;
    remarks?: string;
}

export type EpUpdateInput = Partial<EpCreateInput>;

// ── Family Member ────────────────────────────────────────────
export interface FamilyMember {
    family_member_id: number;
    affected_person_id: number;
    name?: string | null;
    relationship_id: number;
    relationship?: string;
    relationship_other?: string | null;
    gender_id: number;
    gender?: string;
    gender_other?: string | null;
    marital_status?: string | null;
    age: number | null;
    education?: string | null;
    education_other?: string | null;
    occupation_id: number | null;
    occupation?: string;
    occupation_other?: string | null;
    does_work?: boolean | null;
    annual_income?: number | null;
    health_status?: string | null;
    disability_type?: string | null;
    is_dependent: boolean;
    remarks: string | null;
}

// ── Land ─────────────────────────────────────────────────────
export interface Land {
    land_id: number;
    affected_person_id: number;
    land_type_id: number;
    land_type?: string;
    land_type_other?: string | null;
    land_status_id: number;
    land_status?: string;
    ownership_type_id: number;
    ownership_type?: string;
    ownership_type_other?: string | null;
    district_id: number;
    district?: string;
    upazila_id: number;
    upazila?: string;
    village_id: number | null;
    mouza: string | null;
    khatian_number: string | null;
    dag_number: string | null;
    la_case_no: string | null;
    dc_pay_amount: string | null;
    dc_cheque_no: string | null;
    dc_pay_date: string | null;
    land_area: string;
    land_area_unit_id: number;
    land_area_unit?: string;
    land_use_type_id: number;
    land_use_type?: string;
    land_use_type_other?: string | null;
    remarks: string | null;
}

// ── Tree ─────────────────────────────────────────────────────
export interface Tree {
    tree_id: number;
    affected_person_id: number;
    name?: string | null;
    land_ownership?: string | null;
    tree_type_id: number;
    tree_type?: string;
    tree_type_other?: string | null;
    tree_age_category_id: number;
    tree_age_category?: string;
    quantity: number;
    remarks: string | null;
}

// ── Infrastructure ───────────────────────────────────────────
export interface Infrastructure {
    infrastructure_id: number;
    affected_person_id: number;
    infrastructure_type_id: number;
    infrastructure_type?: string;
    infrastructure_type_other?: string | null;
    usage_type_id: number;
    usage_type?: string;
    usage_type_other?: string | null;
    structure_nature: 'Primary' | 'Secondary' | null;
    structure_material: 'Pacca' | 'Semi Pacca' | 'Tin Made' | 'Katcha' | 'Thatched' | 'Other' | null;
    structure_material_other?: string | null;
    unit?: string | null;
    length: string | null;
    width: string | null;
    area_sqft: string | null;
    damage_percentage: string | null;
    remarks: string | null;
}

// ── Tenant ───────────────────────────────────────────────────
export interface Tenant {
    tenant_id: number;
    affected_person_id: number;
    ep_id: string | null;
    hh_id: string | null;
    tenant_type_id: number;
    tenant_type?: string;
    name: string;
    father_name: string | null;
    nid_number: string | null;
    mobile: string | null;
    mouza: string | null;
    union_name: string | null;
    district_id: number | null;
    district_name?: string;
    upazila_id: number | null;
    upazila_name?: string;
    age: number | null;
    gender_id: number | null;
    gender_name?: string;
    gender?: string | { gender_id: number; name: string } | null;
    occupation_id: number | null;
    occupation?: string | { occupation_id: number; name: string } | null;
    occupation_name?: string;
    occupation_other?: string | null;
    annual_income: string | null;
    infrastructure_id: number | null;
    infrastructure_type?: string;
    infrastructure_ids?: number[];
    infrastructures?: { infrastructure_id: number }[];
    address: string | null;
    agreement_number: string | null;
    monthly_rent: string | null;
    remarks: string | null;
    district?: { district_id: number; name: string } | string | null;
    upazila?: { upazila_id: number; name: string } | string | null;
}

// ── Worker ───────────────────────────────────────────────────
export interface Worker {
    worker_id: number;
    affected_person_id: number;
    ep_id: string | null;
    business_id: number | null;
    business_name?: string | null;
    name: string;
    father_name?: string | null;
    mobile?: string | null;
    nid_number?: string | null;
    mouza?: string | null;
    union_name?: string | null;
    district_id?: number | null;
    upazila_id?: number | null;
    district_name?: string | null;
    upazila_name?: string | null;
    district?: { district_id: number; name: string } | string | null;
    upazila?: { upazila_id: number; name: string } | string | null;
    total_family_member?: number | null;
    duration_of_employment_month?: number | null;
    gender_id: number;
    gender?: string;
    gender_other?: string | null;
    age: number | null;
    occupation_id: number | null;
    occupation?: string;
    occupation_other?: string | null;
    employment_type_id: number | null;
    employment_type?: string;
    employment_type_other?: string | null;
    monthly_income: string;
    remarks: string | null;
}

// ── Business ─────────────────────────────────────────────────
export interface Business {
    business_id: number;
    affected_person_id: number;
    business_ownership_type_id: number;
    business_ownership_type?: string;
    ownership_code: 'OWNER' | 'TENANT';
    tenant_id: number | null;
    business_type_id: number;
    business_type?: string;
    business_type_other?: string | null;
    business_category_id: number;
    business_category?: string;
    business_name: string;
    present_address?: string | null;
    capital_amount: string;
    annual_income?: string | null;
    has_wage_labour?: boolean;
    number_of_wage_labour?: number | null;
    has_income_tax: boolean;
    income_tax_id: string | null;
    remarks: string | null;
}

// ── Crop (nested under Land) ─────────────────────────────────
export interface Crop {
    crop_id: number;
    land_id: number;
    crop_type_id: number;
    crop_type?: string;
    crop_type_other?: string | null;
    crop_season_id: number;
    crop_season?: string;
    cultivated_area: string;
    area_unit_id: number;
    area_unit?: string;
    damage_percentage: string;
    remarks: string | null;
}

// ── Assessments (1:1 with parent, rate snapshot pattern) ─────
export interface LandAssessment {
    land_assessment_id: number;
    land_id: number;
    damage_type_id: number;
    damage_type?: string;
    affected_area: string;
    unit_id: number;
    unit?: string;
    rate_id: number;
    rate_per_unit: string;
    assessed_loss: string;
    remarks: string | null;
}

export interface TreeAssessment {
    tree_assessment_id: number;
    tree_id: number;
    rate_id: number;
    quantity: number;
    rate_per_tree: string;
    assessed_loss: string;
    remarks: string | null;
}

export interface InfrastructureAssessment {
    infrastructure_assessment_id: number;
    infrastructure_id: number;
    rate_id: number;
    area_sqft: string;
    damage_percentage: string;
    rate_per_sqft: string;
    assessed_loss: string;
    remarks: string | null;
}

export interface CropAssessment {
    crop_assessment_id: number;
    crop_id: number;
    rate_id: number;
    cultivated_area: string;
    damage_percentage: string;
    rate_per_unit: string;
    assessed_loss: string;
    remarks: string | null;
}

export interface WorkerAssessment {
    worker_assessment_id: number;
    worker_id: number;
    loss_amount: string;
    remarks: string | null;
}

export interface BusinessLoss {
    business_loss_id: number;
    business_id: number;
    loss_amount: string;
    remarks: string | null;
}

// ── Rate lookup (GET /api/v1/rates/{type}) ──────────────────
export interface RateItem {
    rate_id: number;
    rate_type: 'land' | 'tree' | 'infrastructure' | 'crop';
    rate_per_unit: string;
    effective_date: string | null;
    // land
    land_type_id?: number;
    land_type?: string;
    land_use_type_id?: number;
    land_use_type?: string;
    unit_id?: number;
    unit?: string;
    // tree
    tree_type_id?: number;
    tree_type?: string;
    tree_age_category_id?: number;
    tree_age_category?: string;
    // infrastructure
    infrastructure_type_id?: number;
    infrastructure_type?: string;
    usage_type_id?: number;
    usage_type?: string;
    // crop
    crop_type_id?: number;
    crop_type?: string;
    crop_season_id?: number;
    crop_season?: string;
}

// ── EP File Data (document generation) ──────────────────────
export interface EpFileData extends AffectedPerson {
    project?: string;
    project_code?: string;
    family_members?: FamilyMember[];
    lands?: Land[];
    trees?: Tree[];
    infrastructures?: Infrastructure[];
    tenants?: Tenant[];
    businesses?: Record<string, unknown>[];
    workers?: Worker[];
    epicad?: Record<string, unknown> | null;
    ec?: Record<string, unknown> | null;
}

// ── Master lookup item (for dropdowns) ───────────────────────
export interface MasterItem {
    [key: string]: number | string | boolean | null;
}

// ── Status History ───────────────────────────────────────────
export interface StatusHistoryEntry {
    status_history_id: number;
    entity_type: string;
    entity_id: number;
    previous_status: string | null;
    new_status: string;
    changed_by: number | null;
    changed_at: string;
    remarks: string | null;
    changedBy?: {
        user_id: number;
        full_name: string;
        username: string;
    } | null;
}
