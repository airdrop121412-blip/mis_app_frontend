// ═══════════════════════════════════════════════════════════════
// EPForm — Create / Edit form for Affected Persons (Multi-step wizard)
// Phase 4B-10B
//
// IMPORTANT: All validation lives in AffectedPersonStoreRequest /
// AffectedPersonUpdateRequest on the backend. This form sends the
// data and displays errors returned by the API — it does NOT
// duplicate business rules.
// ═══════════════════════════════════════════════════════════════

import { Fragment, useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  useEp, useCreateEp, useUpdateEp,
  useFamilyMembers,
  useLands,
  useInfrastructures,
  useTrees,
  useTenants,
  useBusinesses,
  useWorkers,
} from '../../hooks/useEp';
import type { EpCreateInput, MasterItem } from '../../types/ep';
import {
  createCrop as apiCreateCrop,
  createFamilyMember as apiCreateFamilyMember,
  deleteFamilyMember as apiDeleteFamilyMember,
  createLand as apiCreateLand,
  deleteLand as apiDeleteLand,
  createInfrastructure as apiCreateInfrastructure,
  deleteInfrastructure as apiDeleteInfrastructure,
  createTree as apiCreateTree,
  deleteTree as apiDeleteTree,
  createTenant as apiCreateTenant,
  updateTenant as apiUpdateTenant,
  deleteTenant as apiDeleteTenant,
  createBusiness as apiCreateBusiness,
  deleteBusiness as apiDeleteBusiness,
  createWorker as apiCreateWorker,
  deleteWorker as apiDeleteWorker,
} from '../../api/ep';
import {
  useGenders, useReligions, useOccupations, useDistricts,
  useUpazilas, useRelationships, useProjectPhases, useLossCategories, useRcTypes,
  useLandTypes, useOwnershipTypes, useLandStatuses, useLandUseTypes, useUnits,
  useCropTypes, useCropSeasons,
  useInfrastructureTypes, useUsageTypes,
  useTreeTypes, useTreeAgeCategories,
  useTenantTypes,
  useBusinessTypes, useBusinessCategories, useBusinessOwnershipTypes,
  useEmploymentTypes,
  masterValue, masterLabel,
} from '../../hooks/useMasters';
import { PageLayout } from '../../components/PageLayout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { EntryListEditor } from '../../components/ep/EntryListEditor';
import { useProject } from '../../contexts/ProjectContext';
import { useCorrectionUpdateEp } from '../../hooks/useCorrection';

interface FieldErrors {
  [field: string]: string[];
}

// ── Child record default templates ──────────────────────────
interface CropEntry {
  crop_id: number;
  crop_type_id: number;
  crop_type_other: string;
  crop_season_id: number;
  cultivated_area: number;
  area_unit_id: number;
  damage_percentage: number;
  remarks: string;
}

function emptyFamilyMember() {
  return {
    family_member_id: 0,
    name: '',
    relationship_id: 0,
    relationship_other: '',
    gender_id: 0,
    gender_other: '',
    marital_status: '',
    age: null as number | null,
    education: '',
    education_other: '',
    occupation_id: 0,
    occupation_other: '',
    does_work: null as boolean | null,
    annual_income: null as number | null,
    health_status: '',
    disability_type: '',
    is_dependent: false,
    remarks: '',
  };
}
function emptyLand() {
  return { land_id: 0, land_type_id: 0, land_type_other: '', land_status_id: 0, ownership_type_id: 0, ownership_type_other: '', district_id: 0, upazila_id: 0, village_id: 0, mouza: '', khatian_number: '', dag_number: '', la_case_no: '', dc_pay_amount: null as number | null, dc_cheque_no: '', dc_pay_date: '', land_area: 0, land_area_unit_id: 0, land_use_type_id: 0, land_use_type_other: '', remarks: '', crops: [] as CropEntry[] };
}
function emptyCrop(): CropEntry {
  return { crop_id: 0, crop_type_id: 0, crop_type_other: '', crop_season_id: 0, cultivated_area: 0, area_unit_id: 0, damage_percentage: 0, remarks: '' };
}
function emptyStructure() {
  return { infrastructure_id: 0, infrastructure_type_id: 0, infrastructure_type_other: '', usage_type_id: 0, usage_type_other: '', structure_nature: '', structure_material: '', structure_material_other: '', unit: '', length: null as number | null, width: null as number | null, area_sqft: 0, damage_percentage: 0, remarks: '' };
}
function emptyTree() {
  return { tree_id: 0, name: '', land_ownership: '', tree_type_id: 0, tree_type_other: '', tree_age_category_id: 0, quantity: 0, remarks: '' };
}
function emptyTenant() {
  return {
    tenant_id: 0,
    ep_id: '',
    hh_id: '',
    tenant_type_id: 0,
    name: '',
    father_name: '',
    nid_number: '',
    mobile: '',
    mouza: '',
    union_name: '',
    district_id: 0,
    upazila_id: 0,
    age: null as number | null,
    gender_id: 0,
    occupation_id: 0,
    occupation_other: '',
    annual_income: null as number | null,
    infrastructure_id: 0,
    structure_idx: -1,
    structure_idxs: [] as number[],
    infrastructure_ids: [] as number[],
    address: '',
    agreement_number: '',
    monthly_rent: 0,
    remarks: '',
  };
}
function emptyBusiness() {
  return { business_id: 0, business_ownership_type_id: 0, tenant_id: null as number | null, business_type_id: 0, business_type_other: '', business_category_id: 0, business_name: '', present_address: '', capital_amount: 0, annual_income: null as number | null, has_wage_labour: false, number_of_wage_labour: null as number | null, has_income_tax: false, income_tax_id: '', remarks: '' };
}
function emptyWorker() {
  return { worker_id: 0, ep_id: '', business_id: 0, name: '', father_name: '', mobile: '', nid_number: '', mouza: '', union_name: '', district_id: 0, upazila_id: 0, total_family_member: null as number | null, duration_of_employment_month: null as number | null, gender_id: 0, gender_other: '', age: null as number | null, occupation_id: 0, occupation_other: '', employment_type_id: 0, employment_type_other: '', monthly_income: 0, remarks: '' };
}

type FamilyMemberEntry = ReturnType<typeof emptyFamilyMember>;
type LandEntry = ReturnType<typeof emptyLand>;
type StructureEntry = ReturnType<typeof emptyStructure>;
type TreeEntry = ReturnType<typeof emptyTree>;
type TenantEntry = ReturnType<typeof emptyTenant>;
type BusinessEntry = ReturnType<typeof emptyBusiness>;
type WorkerEntry = ReturnType<typeof emptyWorker>;

// ── Step definitions ───────────────────────────────────────────
const WIZARD_STEPS = [
  { id: 1, title: 'Personal Information', icon: '👤' },
  { id: 2, title: 'Family Information', icon: '👨‍👩‍👧‍👦' },
  { id: 3, title: 'Land Information', icon: '🌾' },
  { id: 4, title: 'Crop Information', icon: '🌽' },
  { id: 5, title: 'Structure Information', icon: '🏠' },
  { id: 6, title: 'Tree', icon: '🌳' },
  { id: 7, title: 'Tenant', icon: '🏢' },
  { id: 8, title: 'Business', icon: '💼' },
  { id: 9, title: 'Wage Labour', icon: '🛠️' },
  { id: 10, title: 'GPS Location', icon: '📍' },
];

// ── Capture-form option lists (from Capture.PNG) ─────────────
const CATEGORY_OF_LOSS_OPTIONS = [
  'Land',
  'Structure',
  'Tree',
  'Land and Structure',
  'Structure and Tree',
  'Land and Tree',
  'Land, Structure and Tree',
  'Tenant',
  'Wage Loss',
];

const OWNERSHIP_OPTIONS = ['Title', 'Non-title'];

const TREE_LAND_OWNERSHIP_OPTIONS = ['Private Land', 'Govt. Land', 'Share/Lease'];

const MARITAL_STATUS_OPTIONS = ['Married', 'Unmarried', 'Widow/Widower'];

const HEALTH_STATUS_OPTIONS = [
  'Disabled',
  'Without disability or chronic illness',
  'Chronic illness',
];

const DISABILITY_TYPES = ['Physical', 'Deaf', 'Dumb', 'Blind'];

const EDUCATION_LEVELS = [
  'Class I', 'Class II', 'Class III', 'Class IV', 'Class V',
  'Class VI', 'Class VII', 'Class VIII', 'Class IX', 'Class X',
  'Class XI', 'Class XII',
  'SSC or equivalent', 'HSC or equivalent', 'Degree or equivalent', 'Master or equivalent',
  'no schooling', 'Other',
];

// Upazila picker that loads its own options for the tenant's chosen district
// (useUpazilas must run in a stable component, not inside renderFields).
function TenantUpazilaField({ districtId, value, onSelect }: { districtId: number; value: number; onSelect: (v: number) => void }) {
  const { items: upazilas } = useUpazilas(districtId || null);
  return (
    <Field label="Upazila">
      <select value={value} onChange={(e) => onSelect(Number(e.target.value))} className="form-select" disabled={!districtId}>
        <option value={0}>{districtId ? 'Select...' : 'Select district first'}</option>
        {upazilas.map((u) => (
          <option key={masterValue(u)} value={masterValue(u)}>{masterLabel(u)}</option>
        ))}
      </select>
    </Field>
  );
}

export interface EPFormProps {
  /**
   * Admin-correction mode. Uses this EP id instead of the route param so the
   * wizard can be rendered inside a modal on the Correction screen.
   */
  overrideEpId?: number | null;
  /**
   * The reason captured on the Correction screen. When present the save goes
   * through the correction endpoint, which stores the reason and every changed
   * field in Correction History before writing.
   */
  correctionReason?: string | null;
  /** Called after a successful save instead of navigating away. */
  onSaved?: () => void;
}

export function EPForm({ overrideEpId = null, correctionReason = null, onSaved }: EPFormProps = {}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const resolvedId = overrideEpId ?? (id ? Number(id) : null);
  const isEdit = !!resolvedId;
  const epId = resolvedId;
  const isCorrection = !!correctionReason && isEdit;
  const { project } = useProject();

  // ── Fetch existing EP (edit mode) ───────────────────────────
  const { data: existing, isLoading: loadingEp } = useEp(epId);

  // ── Fetch master data for dropdowns ─────────────────────────
  const { items: genders } = useGenders();
  const { items: religions } = useReligions();
  const { items: occupations } = useOccupations();
  const { items: districts } = useDistricts();

  // ── Hierarchical: district → upazila ────────────────────────
  const [districtId, setDistrictId] = useState<number | null>(null);
  const { items: upazilas } = useUpazilas(districtId);
  const { items: projectPhases } = useProjectPhases();
  const { items: lossCategories } = useLossCategories();

  // Category of Loss = seeded list + any loss categories configured under
  // Admin → EP ID Codes (so EP ID code entries appear in this dropdown).
  const categoryOfLossOptions = useMemo(() => {
    const extras = lossCategories
      .map((c) => c.name)
      .filter((n) => !CATEGORY_OF_LOSS_OPTIONS.includes(n));
    return [...CATEGORY_OF_LOSS_OPTIONS, ...extras];
  }, [lossCategories]);

  // ── Mutations ───────────────────────────────────────────────
  const createEp = useCreateEp();
  const updateEp = useUpdateEp(epId!);
  // Only invoked in admin-correction mode; the backend requires the reason
  // before it will write an APPROVED EP.
  const correctionUpdate = useCorrectionUpdateEp(epId ?? 0, correctionReason ?? '');

  const isPending = createEp.isPending || updateEp.isPending || correctionUpdate.isPending;
  const mutationError = createEp.error || updateEp.error || correctionUpdate.error;

  // ── Form state ──────────────────────────────────────────────
  const [form, setForm] = useState({
    project_id: project?.project_id ?? 1,
    ep_id: '',
    hh_id: '',
    name: '',
    father_name: '',
    mother_name: '',
    spouse_name: '',
    nid_number: '',
    mobile: '',
    gender_id: 0,
    gender_other: '',
    date_of_birth: '',
    age: null as number | null,
    religion_id: 0,
    religion_other: '',
    occupation_id: 0,
    occupation_other: '',
    district_id: 0,
    upazila_id: 0,
    phase: '',
    mouza: '',
    union_name: '',
    category_of_loss: '',
    ownership: '',
    dc_compensation: null as number | null,
    cheque_no: '',
    cheque_date: '',
    dc_tree_compensation: null as number | null,
    dc_tree_cheque_no: '',
    dc_tree_cheque_date: '',
    yearly_income: null as number | null,
    is_disabled: false,
    is_landless: false,
    is_tribal: false,
    has_business_loss: false,
    shifting_materials: '',
    nature_of_displacement: '',
    displacement_status: '',
    is_tenant: false,
    total_tenant: null as number | null,
    stamp_duty: null as number | null,
    no_displacement: false,
    // Land Status is required by the backend but not exposed in the form UI;
    // default to TITLE. R/C Type ("Type Of HH By Structure Loss") is a required
    // dropdown on Step 1, so it starts unselected.
    land_status_id: 1,
    rc_type_id: 0,
    monthly_income: 0,
    monthly_expense: 0,
    gps_latitude: null as number | null,
    gps_longitude: null as number | null,
    location_accuracy: null as number | null,
    location_source_id: 0,
    is_household_head: false,
    total_family_member: null as number | null,
    male_member: null as number | null,
    female_member: null as number | null,
    remarks: '',
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [childSaveError, setChildSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // ── Wizard step tracking ────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = WIZARD_STEPS.length;

  // ── Master data for child forms ─────────────────────────────
  const { items: relationships } = useRelationships();
  const { items: landTypes } = useLandTypes();
  const { items: ownershipTypes } = useOwnershipTypes();
  const { items: landStatuses } = useLandStatuses();
  const { items: rcTypes } = useRcTypes();
  const { items: landUseTypes } = useLandUseTypes();
  const { items: units } = useUnits();
  const { items: cropTypes } = useCropTypes();
  const { items: cropSeasons } = useCropSeasons();
  const { items: infrastructureTypes } = useInfrastructureTypes();
  const { items: usageTypes } = useUsageTypes();
  const { items: treeTypes } = useTreeTypes();
  const { items: treeAgeCategories } = useTreeAgeCategories();
  const { items: tenantTypes } = useTenantTypes();
  const { items: businessTypes } = useBusinessTypes();
  const { items: businessCategories } = useBusinessCategories();
  const { items: businessOwnershipTypes } = useBusinessOwnershipTypes();
  const { items: employmentTypes } = useEmploymentTypes();

  // ── "Other" option IDs for conditional text inputs ─────────
  const otherRelationshipId = relationships.find((r) => masterLabel(r) === 'Other') ? masterValue(relationships.find((r) => masterLabel(r) === 'Other')!) : 0;
  const otherGenderId = genders.find((g) => masterLabel(g) === 'Other') ? masterValue(genders.find((g) => masterLabel(g) === 'Other')!) : 0;
  const otherOccupationId = occupations.find((o) => masterLabel(o) === 'Other') ? masterValue(occupations.find((o) => masterLabel(o) === 'Other')!) : 0;
  const otherReligionId = religions.find((r) => masterLabel(r) === 'Other') ? masterValue(religions.find((r) => masterLabel(r) === 'Other')!) : 0;
  const otherLandTypeId = landTypes.find((t) => masterLabel(t) === 'Other') ? masterValue(landTypes.find((t) => masterLabel(t) === 'Other')!) : 0;
  const otherOwnershipTypeId = ownershipTypes.find((o) => masterLabel(o) === 'Other') ? masterValue(ownershipTypes.find((o) => masterLabel(o) === 'Other')!) : 0;
  const otherLandUseTypeId = landUseTypes.find((t) => masterLabel(t) === 'Other') ? masterValue(landUseTypes.find((t) => masterLabel(t) === 'Other')!) : 0;
  const otherCropTypeId = cropTypes.find((t) => masterLabel(t) === 'Other') ? masterValue(cropTypes.find((t) => masterLabel(t) === 'Other')!) : 0;
  const otherInfrastructureTypeId = infrastructureTypes.find((t) => masterLabel(t) === 'Other') ? masterValue(infrastructureTypes.find((t) => masterLabel(t) === 'Other')!) : 0;
  const otherUsageTypeId = usageTypes.find((t) => masterLabel(t) === 'Other') ? masterValue(usageTypes.find((t) => masterLabel(t) === 'Other')!) : 0;
  const otherBusinessTypeId = businessTypes.find((t) => masterLabel(t) === 'Other') ? masterValue(businessTypes.find((t) => masterLabel(t) === 'Other')!) : 0;
  const tenantBusinessOwnershipTypeId = businessOwnershipTypes.find((o) => masterLabel(o) === 'Tenant') ? masterValue(businessOwnershipTypes.find((o) => masterLabel(o) === 'Tenant')!) : 0;
  const otherEmploymentTypeId = employmentTypes.find((t) => masterLabel(t) === 'Other') ? masterValue(employmentTypes.find((t) => masterLabel(t) === 'Other')!) : 0;
  const titleLandStatusId = landStatuses.find((s) => masterLabel(s) === 'Title') ? masterValue(landStatuses.find((s) => masterLabel(s) === 'Title')!) : 0;

  // Ownership (Step 1) → default Land Status for new land parcels in Step 3.
  // e.g. ownership "Non-title" auto-selects the "Non-Title" land status.
  const landStatusIdForOwnership = useMemo(() => {
    const norm = (v: string) => v.trim().toLowerCase().replace(/[\s-]+/g, '');
    const own = norm(form.ownership ?? '');
    if (!own) return 0;
    const status = landStatuses.find((s) => norm(masterLabel(s)) === own);
    return status ? masterValue(status) : 0;
  }, [form.ownership, landStatuses]);

  // ── Child record state (steps 2-9) ─────────────────────────
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberEntry[]>([]);
  // The member currently being typed in the Step 2 "Family Information" form.
  const [newMember, setNewMember] = useState<FamilyMemberEntry>(emptyFamilyMember());
  const [newMemberErrors, setNewMemberErrors] = useState<{ general?: string[] }>({});
  // The tree currently being typed (Step 6). One entry = one tree type + a
  // quantity for EACH age category (Plant / Small / Medium / Big).
  const [newTree, setNewTree] = useState<{ name: string; land_ownership: string; tree_type_id: number; quantities: Record<number, number>; remarks: string }>({
    name: '',
    land_ownership: '',
    tree_type_id: 0,
    quantities: {},
    remarks: '',
  });
  const [newTreeErrors, setNewTreeErrors] = useState<{ general?: string[] }>({});
  const [lands, setLands] = useState<LandEntry[]>([]);
  const [structures, setStructures] = useState<StructureEntry[]>([]);
  const [trees, setTrees] = useState<TreeEntry[]>([]);
  const [tenants, setTenants] = useState<TenantEntry[]>([]);
  const [businesses, setBusinesses] = useState<BusinessEntry[]>([]);
  const [workers, setWorkers] = useState<WorkerEntry[]>([]);

  // Step 9 (Wage Labour) is only shown when at least one saved business is
  // marked as having wage labour.
  const hasWageLabour = businesses.some((b) => b.has_wage_labour);

  // Flattened crop list across all land parcels (for Step 4 Crop Information)
  const flatCrops = useMemo(() => {
    const result: (CropEntry & { land_id: number })[] = [];
    for (const l of lands) {
      for (const c of l.crops) {
        result.push({ ...c, land_id: l.land_id });
      }
    }
    return result;
  }, [lands]);

  // ── Load existing child records (edit mode) ────────────────
  const { data: existingFamilyMembers } = useFamilyMembers(epId!);
  const { data: existingLands } = useLands(epId!);
  const { data: existingStructures } = useInfrastructures(epId!);
  const { data: existingTrees } = useTrees(epId!);
  const { data: existingTenants } = useTenants(epId!);
  const { data: existingBusinesses } = useBusinesses(epId!);
  const { data: existingWorkers } = useWorkers(epId!);

  useEffect(() => {
    if (existingFamilyMembers?.items?.length) {
      setFamilyMembers(existingFamilyMembers.items.map((m) => ({
        family_member_id: m.family_member_id,
        name: m.name ?? '',
        relationship_id: m.relationship_id,
        relationship_other: m.relationship_other ?? '',
        gender_id: m.gender_id,
        gender_other: m.gender_other ?? '',
        marital_status: m.marital_status ?? '',
        age: m.age ?? null,
        education: m.education ?? '',
        education_other: m.education_other ?? '',
        occupation_id: m.occupation_id ?? 0,
        occupation_other: m.occupation_other ?? '',
        does_work: m.does_work ?? null,
        annual_income: m.annual_income ? Number(m.annual_income) : null,
        health_status: m.health_status ?? '',
        disability_type: m.disability_type ?? '',
        is_dependent: m.is_dependent,
        remarks: m.remarks ?? '',
      })));
      setNewMember(emptyFamilyMember());
    }
  }, [existingFamilyMembers]);

  useEffect(() => {
    if (existingLands?.items?.length) {
      setLands(existingLands.items.map((l) => ({
        land_id: l.land_id,
        land_type_id: l.land_type_id,
        land_type_other: l.land_type_other ?? '',
        land_status_id: l.land_status_id,
        ownership_type_id: l.ownership_type_id,
        ownership_type_other: l.ownership_type_other ?? '',
        district_id: l.district_id,
        upazila_id: l.upazila_id,
        village_id: l.village_id ?? 0,
        mouza: l.mouza ?? '',
        khatian_number: l.khatian_number ?? '',
        dag_number: l.dag_number ?? '',
        la_case_no: l.la_case_no ?? '',
        dc_pay_amount: l.dc_pay_amount ? Number(l.dc_pay_amount) : null,
        dc_cheque_no: l.dc_cheque_no ?? '',
        dc_pay_date: l.dc_pay_date ?? '',
        land_area: Number(l.land_area) || 0,
        land_area_unit_id: l.land_area_unit_id,
        land_use_type_id: l.land_use_type_id,
        land_use_type_other: l.land_use_type_other ?? '',
        remarks: l.remarks ?? '',
        crops: [],
      })));
    }
  }, [existingLands]);

  useEffect(() => {
    if (existingStructures?.items?.length) {
      setStructures(existingStructures.items.map((s) => ({
        infrastructure_id: s.infrastructure_id,
        infrastructure_type_id: s.infrastructure_type_id,
        infrastructure_type_other: s.infrastructure_type_other ?? '',
        usage_type_id: s.usage_type_id,
        usage_type_other: s.usage_type_other ?? '',
        structure_nature: s.structure_nature ?? '',
        structure_material: s.structure_material ?? '',
        structure_material_other: s.structure_material_other ?? '',
        unit: s.unit ?? '',
        length: s.length ? Number(s.length) : null,
        width: s.width ? Number(s.width) : null,
        area_sqft: Number(s.area_sqft) || 0,
        damage_percentage: Number(s.damage_percentage) || 0,
        remarks: s.remarks ?? '',
      })));
    }
  }, [existingStructures]);

  useEffect(() => {
    if (existingTrees?.items?.length) {
      setTrees(existingTrees.items.map((t) => ({
        tree_id: t.tree_id,
        name: t.name ?? '',
        land_ownership: t.land_ownership ?? '',
        tree_type_id: t.tree_type_id,
        tree_type_other: t.tree_type_other ?? '',
        tree_age_category_id: t.tree_age_category_id,
        quantity: t.quantity,
        remarks: t.remarks ?? '',
      })));
    }
  }, [existingTrees]);

  useEffect(() => {
    if (existingTenants?.items?.length) {
      setTenants(existingTenants.items.map((t) => ({
        tenant_id: t.tenant_id,
        ep_id: t.ep_id ?? '',
        hh_id: t.hh_id ?? '',
        tenant_type_id: t.tenant_type_id,
        name: t.name,
        father_name: t.father_name ?? '',
        nid_number: t.nid_number ?? '',
        mobile: t.mobile ?? '',
        mouza: t.mouza ?? '',
        union_name: t.union_name ?? '',
        district_id: t.district_id ?? 0,
        upazila_id: t.upazila_id ?? 0,
        age: t.age ?? null,
        gender_id: t.gender_id ?? 0,
        occupation_id: t.occupation_id ?? 0,
        occupation_other: t.occupation_other ?? '',
        annual_income: t.annual_income === null || t.annual_income === undefined ? null : Number(t.annual_income),
        infrastructure_id: t.infrastructure_id ?? 0,
        structure_idx: -1,
        structure_idxs: Array.isArray(t.infrastructure_ids)
          ? t.infrastructure_ids.map((id) => Math.max(structures.findIndex((s) => s.infrastructure_id === id), 0))
          : [],
        infrastructure_ids: Array.isArray(t.infrastructure_ids) ? t.infrastructure_ids : [],
        address: t.address ?? '',
        agreement_number: t.agreement_number ?? '',
        monthly_rent: Number(t.monthly_rent) || 0,
        remarks: t.remarks ?? '',
      })));
    }
  }, [existingTenants]);

  useEffect(() => {
    if (existingBusinesses?.items?.length) {
      setBusinesses(existingBusinesses.items.map((b) => ({
        business_id: b.business_id,
        business_ownership_type_id: b.business_ownership_type_id,
        tenant_id: b.tenant_id ?? null,
        business_type_id: b.business_type_id,
        business_type_other: b.business_type_other ?? '',
        business_category_id: b.business_category_id,
        business_name: b.business_name,
        present_address: b.present_address ?? '',
        capital_amount: Number(b.capital_amount) || 0,
        annual_income: b.annual_income ? Number(b.annual_income) : null,
        has_wage_labour: b.has_wage_labour ?? false,
        number_of_wage_labour: b.number_of_wage_labour ?? null,
        has_income_tax: b.has_income_tax,
        income_tax_id: b.income_tax_id ?? '',
        remarks: b.remarks ?? '',
      })));
    }
  }, [existingBusinesses]);

  useEffect(() => {
    if (existingWorkers?.items?.length) {
      setWorkers(existingWorkers.items.map((w) => ({
        worker_id: w.worker_id,
        ep_id: w.ep_id ?? '',
        business_id: w.business_id ?? 0,
        name: w.name,
        father_name: w.father_name ?? '',
        mobile: w.mobile ?? '',
        nid_number: w.nid_number ?? '',
        mouza: w.mouza ?? '',
        union_name: w.union_name ?? '',
        district_id: w.district_id ?? 0,
        upazila_id: w.upazila_id ?? 0,
        total_family_member: w.total_family_member ?? null,
        duration_of_employment_month: w.duration_of_employment_month ?? null,
        gender_id: w.gender_id,
        gender_other: w.gender_other ?? '',
        age: w.age ?? null,
        occupation_id: w.occupation_id ?? 0,
        occupation_other: w.occupation_other ?? '',
        employment_type_id: w.employment_type_id ?? 0,
        employment_type_other: w.employment_type_other ?? '',
        monthly_income: Number(w.monthly_income) || 0,
        remarks: w.remarks ?? '',
      })));
    }
  }, [existingWorkers]);

  // ── Generic updater for child arrays ───────────────────────
  function removeChild<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number) {
    setDirty(true);
    setter((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Family member: one-line list helpers ────────────────────
  function memberLabel(items: MasterItem[], id: number) {
    const found = items.find((it) => masterValue(it) === id);
    return found ? masterLabel(found) : '—';
  }

  // Commits the currently-typed member to the saved one-line list.
  function saveNewMember() {
    if (!newMember.relationship_id || !newMember.gender_id) {
      setNewMemberErrors({ general: ['Relationship and Gender are required to save a member.'] });
      return false;
    }
    setFamilyMembers((prev) => [...prev, { ...newMember }]);
    setDirty(true);
    setNewMemberErrors({});
    setNewMember(emptyFamilyMember());
    return true;
  }

  function updateNewMember(field: string, value: unknown) {
    setNewMember((prev) => ({ ...prev, [field]: value }));
    if (newMemberErrors.general) setNewMemberErrors({});
  }

  // ── Tree: multi-size entry helpers (Step 6) ────────────────
  function updateNewTree(field: string, value: unknown) {
    setNewTree((prev) => ({ ...prev, [field]: value }));
    if (newTreeErrors.general) setNewTreeErrors({});
  }

  function setNewTreeQuantity(catId: number, qty: number) {
    setNewTree((prev) => ({ ...prev, quantities: { ...prev.quantities, [catId]: Math.max(0, qty) } }));
    if (newTreeErrors.general) setNewTreeErrors({});
  }

  // Commits the currently-typed tree to one Tree row per age-category size.
  function saveNewTree() {
    if (!newTree.tree_type_id) {
      setNewTreeErrors({ general: ['Tree Type is required to save a tree.'] });
      return false;
    }
    const rows: TreeEntry[] = [];
    for (const cat of treeAgeCategories) {
      const catId = masterValue(cat);
      const qty = newTree.quantities[catId] ?? 0;
      if (qty > 0) {
        rows.push({
          tree_id: 0,
          name: newTree.name.trim(),
          land_ownership: newTree.land_ownership,
          tree_type_id: newTree.tree_type_id,
          tree_type_other: '',
          tree_age_category_id: catId,
          quantity: qty,
          remarks: newTree.remarks,
        });
      }
    }
    if (rows.length === 0) {
      setNewTreeErrors({ general: ['Enter a quantity (1 or more) for at least one size.'] });
      return false;
    }
    setTrees((prev) => [...prev, ...rows]);
    setDirty(true);
    setNewTreeErrors({});
    setNewTree({ name: '', land_ownership: '', tree_type_id: 0, quantities: {}, remarks: '' });
    return true;
  }

  // ── Save child records for a step ──────────────────────────
  async function saveStepChildren(step: number, target?: number): Promise<boolean> {
    const active = target ?? epId;
    if (!active) return true;
    try {
      if (step === 2) {
        const existingIds = (existingFamilyMembers?.items ?? []).map((m) => m.family_member_id);
        const keptIds = new Set(familyMembers.filter((m) => m.family_member_id).map((m) => m.family_member_id));
        for (const id of existingIds.filter((id) => !keptIds.has(id))) {
          await apiDeleteFamilyMember(active, id);
        }
        for (let i = 0; i < familyMembers.length; i++) {
          const m = familyMembers[i];
          if (!m || !m.relationship_id || !m.gender_id || m.family_member_id) continue;
          const { family_member_id, ...payload } = m;
          const created = await apiCreateFamilyMember(active, { ...payload, affected_person_id: active });
          setFamilyMembers((prev) => {
            const next = [...prev];
            const existing = next[i];
            if (!existing) return prev;
            next[i] = { ...existing, family_member_id: created.family_member_id };
            return next;
          });
        }
      } else if (step === 3) {
        const existingLandIds = (existingLands?.items ?? []).map((l) => l.land_id);
        const keptLandIds = new Set(lands.filter((l) => l.land_id).map((l) => l.land_id));
        for (const id of existingLandIds.filter((id) => !keptLandIds.has(id))) {
          await apiDeleteLand(active, id);
        }
        for (let i = 0; i < lands.length; i++) {
          const l = lands[i];
          if (!l || !l.land_type_id) continue;
          if (l.land_id) {
            // Existing land: persist only newly added crops
            for (let j = 0; j < l.crops.length; j++) {
              const c = l.crops[j];
              if (!c || !c.crop_type_id || !c.crop_season_id || c.crop_id) continue;
              const { crop_id, ...cropPayload } = c;
              const created = await apiCreateCrop(active, l.land_id!, {
                ...cropPayload,
                cultivated_area: String(c.cultivated_area),
                damage_percentage: String(c.damage_percentage),
              });
              setLands((prev) => {
                const next = [...prev];
                const entry = next[i];
                if (!entry) return prev;
                next[i] = {
                  ...entry,
                  crops: entry.crops.map((cc, k) => (k === j ? { ...cc, crop_id: created.crop_id } : cc)),
                };
                return next;
              });
            }
          } else {
            const { land_id, district_id, upazila_id, ...landPayload } = l;
            const created = await apiCreateLand(active, {
              ...landPayload,
              affected_person_id: active,
              land_area: String(l.land_area),
              village_id: l.village_id || null,
              dc_pay_amount: l.dc_pay_amount != null ? String(l.dc_pay_amount) : null,
              dc_pay_date: l.dc_pay_date || null,
            });
            setLands((prev) => {
              const next = [...prev];
              const entry = next[i];
              if (!entry) return prev;
              next[i] = { ...entry, land_id: created.land_id };
              return next;
            });
            // Save nested crops for this new land
            if (created.land_id && l.crops.length > 0) {
              for (let j = 0; j < l.crops.length; j++) {
                const c = l.crops[j];
                if (!c || !c.crop_type_id || !c.crop_season_id) continue;
                const { crop_id, ...cropPayload } = c;
                const cropCreated = await apiCreateCrop(active, created.land_id!, {
                  ...cropPayload,
                  cultivated_area: String(c.cultivated_area),
                  damage_percentage: String(c.damage_percentage),
                });
                setLands((prev) => {
                  const next = [...prev];
                  const entry = next[i];
                  if (!entry) return prev;
                  next[i] = {
                    ...entry,
                    crops: entry.crops.map((cc, k) => (k === j ? { ...cc, crop_id: cropCreated.crop_id } : cc)),
                  };
                  return next;
                });
              }
            }
          }
        }
      } else if (step === 5) {
        const existingIds = (existingStructures?.items ?? []).map((s) => s.infrastructure_id);
        const keptIds = new Set(structures.filter((s) => s.infrastructure_id).map((s) => s.infrastructure_id));
        for (const id of existingIds.filter((id) => !keptIds.has(id))) {
          await apiDeleteInfrastructure(active, id);
        }
        for (let i = 0; i < structures.length; i++) {
          const s = structures[i];
          if (!s || !s.infrastructure_type_id || !s.usage_type_id || s.infrastructure_id) continue;
          const { infrastructure_id, ...payload } = s;
          const created = await apiCreateInfrastructure(active, {
            ...payload,
            affected_person_id: active,
            structure_nature: s.structure_nature as 'Primary' | 'Secondary' | null,
            structure_material: s.structure_material as 'Pacca' | 'Semi Pacca' | 'Tin Made' | 'Katcha' | 'Thatched' | 'Other' | null,
            unit: s.unit || null,
            length: s.length != null ? String(s.length) : null,
            width: s.width != null ? String(s.width) : null,
            area_sqft: String(s.area_sqft),
            damage_percentage: String(s.damage_percentage),
          });
          setStructures((prev) => {
            const next = [...prev];
            const existing = next[i];
            if (!existing) return prev;
            next[i] = { ...existing, infrastructure_id: created.infrastructure_id };
            return next;
          });
        }
      } else if (step === 6) {
        const existingIds = (existingTrees?.items ?? []).map((t) => t.tree_id);
        const keptIds = new Set(trees.filter((t) => t.tree_id).map((t) => t.tree_id));
        for (const id of existingIds.filter((id) => !keptIds.has(id))) {
          await apiDeleteTree(active, id);
        }
        for (let i = 0; i < trees.length; i++) {
          const t = trees[i];
          if (!t || !t.tree_type_id || !t.tree_age_category_id || t.tree_id) continue;
          const { tree_id, ...payload } = t;
          const created = await apiCreateTree(active, {
            ...payload,
            affected_person_id: active,
          });
          setTrees((prev) => {
            const next = [...prev];
            const existing = next[i];
            if (!existing) return prev;
            next[i] = { ...existing, tree_id: created.tree_id };
            return next;
          });
        }
      } else if (step === 7) {
        const existingIds = (existingTenants?.items ?? []).map((t) => t.tenant_id);
        const keptIds = new Set(tenants.filter((t) => t.tenant_id).map((t) => t.tenant_id));
        for (const id of existingIds.filter((id) => !keptIds.has(id))) {
          const orphanedBizIds = (existingBusinesses?.items ?? []).filter((b) => b.tenant_id === id).map((b) => b.business_id);
          for (const bid of orphanedBizIds) {
            await apiDeleteBusiness(active, bid);
          }
          if (orphanedBizIds.length > 0) {
            setBusinesses((prev) => prev.filter((b) => b.tenant_id !== id));
          }
          await apiDeleteTenant(active, id);
        }
for (let i = 0; i < tenants.length; i++) {
          const t = tenants[i];
          if (!t || !t.tenant_type_id || !t.name) continue;
          const structureIdxs = Array.isArray(t.structure_idxs) ? t.structure_idxs.map(Number).sort((a, b) => a - b) : [];
          const legacyIdx = t.structure_idx && t.structure_idx >= 0 ? Number(t.structure_idx) : -1;
          let infraIds: number[] = [];
          if (structureIdxs.length > 0) {
            infraIds = structureIdxs
              .map((i) => (structures[i] ? Number(structures[i].infrastructure_id) : 0))
              .filter((id) => id > 0);
          }
          if (infraIds.length === 0 && legacyIdx >= 0 && structures[legacyIdx]) {
            infraIds = [Number(structures[legacyIdx].infrastructure_id)];
          }
          if (infraIds.length === 0 && Array.isArray(t.infrastructure_ids) && t.infrastructure_ids.length) {
            infraIds = t.infrastructure_ids.map(Number);
          }
          const infrastructure_id = infraIds[0] || t.infrastructure_id || null;
          const common = {
            tenant_type_id: t.tenant_type_id,
            name: t.name,
            father_name: t.father_name || null,
            nid_number: t.nid_number || null,
            mobile: t.mobile || null,
            mouza: t.mouza || null,
            union_name: t.union_name || null,
            age: t.age ?? null,
            gender_id: t.gender_id || null,
            occupation_id: t.occupation_id || null,
            occupation_other: t.occupation_other || null,
            annual_income: String(Number(t.annual_income) || 0),
            infrastructure_ids: infraIds.length > 0 ? infraIds : (infrastructure_id ? [infrastructure_id] : []),
            infrastructure_id,
            address: t.address || null,
            agreement_number: t.agreement_number || null,
            monthly_rent: String(Number(t.monthly_rent) || 0),
            remarks: t.remarks || null,
          };
          if (t.tenant_id) {
            if (t.ep_id) continue;
            const updated = await apiUpdateTenant(active, t.tenant_id, {
              ...common,
              hh_id: t.hh_id || undefined,
              district_id: t.district_id || undefined,
              upazila_id: t.upazila_id || undefined,
            });
            setTenants((prev) => {
              const next = [...prev];
              const existing = next[i];
              if (!existing) return prev;
              next[i] = {
                ...existing,
                ep_id: updated.ep_id ?? existing.ep_id,
                hh_id: updated.hh_id ?? form.hh_id,
              };
              return next;
            });
            continue;
          }
          const { tenant_id, structure_idx, structure_idxs, ...payload } = t;
          const created = await apiCreateTenant(active, {
            ...payload,
            affected_person_id: active,
            hh_id: form.hh_id,
            district_id: t.district_id || null,
            upazila_id: t.upazila_id || null,
            occupation_id: t.occupation_id || null,
            annual_income: String(Number(t.annual_income) || 0),
            infrastructure_ids: infraIds.length > 0 ? infraIds : (infrastructure_id ? [infrastructure_id] : []),
            infrastructure_id,
            age: t.age ?? null,
            gender_id: t.gender_id || null,
            monthly_rent: String(Number(t.monthly_rent) || 0),
          });
          setTenants((prev) => {
            const next = [...prev];
            const existing = next[i];
            if (!existing) return prev;
            next[i] = {
              ...existing,
              tenant_id: created.tenant_id,
              ep_id: created.ep_id ?? '',
              hh_id: created.hh_id ?? form.hh_id,
            };
            return next;
          });
        }
      } else if (step === 8) {
        const existingIds = (existingBusinesses?.items ?? []).map((b) => b.business_id);
        const keptIds = new Set(businesses.filter((b) => b.business_id).map((b) => b.business_id));
        for (const id of existingIds.filter((id) => !keptIds.has(id))) {
          await apiDeleteBusiness(active, id);
        }
        for (let i = 0; i < businesses.length; i++) {
          const b = businesses[i];
          if (!b || !b.business_type_id || !b.business_name || b.business_id) continue;
          const { business_id, ...payload } = b;
          const created = await apiCreateBusiness(active, {
            ...payload,
            affected_person_id: active,
            capital_amount: String(b.capital_amount),
            annual_income: b.annual_income != null ? String(b.annual_income) : null,
          });
          setBusinesses((prev) => {
            const next = [...prev];
            const existing = next[i];
            if (!existing) return prev;
            next[i] = { ...existing, business_id: created.business_id };
            return next;
          });
        }
      } else if (step === 9) {
        const existingIds = (existingWorkers?.items ?? []).map((w) => w.worker_id);
        const keptIds = new Set(workers.filter((w) => w.worker_id).map((w) => w.worker_id));
        for (const id of existingIds.filter((id) => !keptIds.has(id))) {
          await apiDeleteWorker(active, id);
        }
        for (let i = 0; i < workers.length; i++) {
          const w = workers[i];
          if (!w || !w.name || !w.gender_id || w.worker_id) continue;
          const { worker_id, ...payload } = w;
          const created = await apiCreateWorker(active, {
            ...payload,
            affected_person_id: active,
            business_id: w.business_id || null,
            monthly_income: String(w.monthly_income),
          });
          setWorkers((prev) => {
            const next = [...prev];
            const existing = next[i];
            if (!existing) return prev;
            next[i] = { ...existing, worker_id: created.worker_id, ep_id: created.ep_id ?? '' };
            return next;
          });
        }
      }
      return true;
    } catch (err) {
      const e = err as { message?: unknown; errors?: Record<string, unknown> };
      let message = err instanceof Error ? err.message : 'An unexpected error occurred while saving.';
      if (typeof e?.message === 'string' && e.message) {
        message = e.message;
      }
      const fieldErrors = e?.errors;
      if (fieldErrors && typeof fieldErrors === 'object' && Object.keys(fieldErrors).length > 0) {
        const first = Object.values(fieldErrors)[0];
        const detail = Array.isArray(first)
          ? first[0]
          : typeof first === 'string'
            ? first
            : undefined;
        if (typeof detail === 'string' && detail) {
          message = `${message} — ${detail}`;
        }
      }
      console.error(`Failed to save step ${step} children:`, err);
      setChildSaveError(message);
      return false;
    }
  }

  // ── Populate form in edit mode ──────────────────────────────
  useEffect(() => {
    if (existing) {
      setDistrictId(existing.district_id);
      setForm({
        project_id: existing.project_id,
        ep_id: existing.ep_id ?? '',
        hh_id: existing.hh_id ?? '',
        name: existing.name,
        father_name: existing.father_name ?? '',
        mother_name: existing.mother_name ?? '',
        spouse_name: existing.spouse_name ?? '',
        nid_number: existing.nid_number,
        mobile: existing.mobile,
        gender_id: existing.gender_id,
        gender_other: '',
        date_of_birth: existing.date_of_birth ?? '',
        age: existing.age ?? null,
        religion_id: existing.religion_id ?? 0,
        religion_other: '',
        occupation_id: existing.occupation_id ?? 0,
        occupation_other: '',
        district_id: existing.district_id,
        upazila_id: existing.upazila_id,
        phase: existing.phase ?? '',
        mouza: existing.mouza ?? '',
        union_name: existing.union_name ?? '',
        category_of_loss: existing.category_of_loss ?? '',
        ownership: existing.ownership ?? '',
        dc_compensation: existing.dc_compensation ? Number(existing.dc_compensation) : null,
        cheque_no: existing.cheque_no ?? '',
        cheque_date: existing.cheque_date ?? '',
        dc_tree_compensation: existing.dc_tree_compensation ? Number(existing.dc_tree_compensation) : null,
        dc_tree_cheque_no: existing.dc_tree_cheque_no ?? '',
        dc_tree_cheque_date: existing.dc_tree_cheque_date ?? '',
        yearly_income: existing.yearly_income ? Number(existing.yearly_income) : null,
        is_disabled: existing.is_disabled,
        is_landless: existing.is_landless,
        is_tribal: existing.is_tribal,
        has_business_loss: existing.has_business_loss,
        shifting_materials: existing.shifting_materials ?? '',
        nature_of_displacement: existing.nature_of_displacement ?? '',
        displacement_status: existing.displacement_status ?? '',
        is_tenant: existing.is_tenant,
        total_tenant: existing.total_tenant ?? null,
        stamp_duty: existing.stamp_duty ? Number(existing.stamp_duty) : null,
        no_displacement: existing.no_displacement,
        land_status_id: existing.land_status_id,
        rc_type_id: existing.rc_type_id,
        monthly_income: Number(existing.monthly_income) || 0,
        monthly_expense: Number(existing.monthly_expense) || 0,
        gps_latitude: existing.gps_latitude ? Number(existing.gps_latitude) : null,
        gps_longitude: existing.gps_longitude ? Number(existing.gps_longitude) : null,
        location_accuracy: existing.location_accuracy ? Number(existing.location_accuracy) : null,
        location_source_id: existing.location_source_id ?? 0,
        is_household_head: existing.is_household_head,
        total_family_member: existing.total_family_member ?? null,
        male_member: existing.male_member ?? null,
        female_member: existing.female_member ?? null,
        remarks: existing.remarks ?? '',
      });
    }
  }, [existing]);

  // Prefill the project's own phase into the EP form (a new EP, or an existing
  // EP that never picked its own phase) once the project loads, so the phase
  // segment of the EP ID reflects the current project phase.
  useEffect(() => {
    const hasOwnPhase = isEdit ? !!existing?.phase : !!form.phase;
    if (project?.phase && !hasOwnPhase) {
      setForm((prev) => ({ ...prev, phase: project.phase ?? '' }));
    }
  }, [project, isEdit, existing, form.phase]);

  function setField(name: string, value: unknown) {
    if ((form as Record<string, unknown>)[name] !== value) setDirty(true);
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  // ── Handle district change → reset upazila ──────────────────
  function handleDistrictChange(value: string) {
    const newDistrictId = value ? Number(value) : 0;
    setDistrictId(newDistrictId > 0 ? newDistrictId : null);
    setField('district_id', newDistrictId);
    setField('upazila_id', 0);
  }

  // ── Submit ──────────────────────────────────────────────────
  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setErrors({});

    // Convert nullable numeric fields to undefined for the API contract
    const payload: EpCreateInput = {
      ...form,
      age: form.age ?? undefined,
      dc_compensation: form.dc_compensation ?? undefined,
      dc_tree_compensation: form.dc_tree_compensation ?? undefined,
      yearly_income: form.yearly_income ?? undefined,
      total_tenant: form.total_tenant ?? undefined,
      stamp_duty: form.stamp_duty ?? undefined,
      total_family_member: form.total_family_member ?? undefined,
      male_member: form.male_member ?? undefined,
      female_member: form.female_member ?? undefined,
      gps_latitude: form.gps_latitude ?? undefined,
      gps_longitude: form.gps_longitude ?? undefined,
      location_accuracy: form.location_accuracy ?? undefined,
      // These are optional in the wizard; send undefined instead of 0 so the
      // backend `nullable`/`exists` validation doesn't reject them.
      religion_id: form.religion_id ? form.religion_id : undefined,
      occupation_id: form.occupation_id ? form.occupation_id : undefined,
      phase: form.phase ? form.phase : undefined,
      monthly_income: form.monthly_income ? form.monthly_income : undefined,
      monthly_expense: form.monthly_expense ? form.monthly_expense : undefined,
      location_source_id: form.location_source_id ? form.location_source_id : undefined,
    };

    try {
      if (isEdit) {
        setChildSaveError(null);
        // An APPROVED EP is locked; the correction endpoint is the only path
        // that may write it, and it stores the captured reason in history.
        if (isCorrection) {
          await correctionUpdate.mutateAsync(payload);
        } else {
          await updateEp.mutateAsync(payload);
        }
        // Save all child records for edit mode
        for (const step of [2, 3, 5, 6, 7, 8, 9]) {
          if (!(await saveStepChildren(step))) return;
        }
        // Inside the Correction modal the parent closes itself; otherwise a
        // successful manual save rolls back to the EP list view.
        if (onSaved) {
          onSaved();
        } else {
          navigate('/ep');
        }
      } else {
        const result = await createEp.mutateAsync(payload);
        // Create mode: persist all child records (family / land+crops /
        // structure / tree / tenant / business / worker) entered during the
        // wizard against the newly created EP — otherwise they stay local-only
        // and never reach the database.
        setChildSaveError(null);
        if (result?.affected_person_id) {
          for (const step of [2, 3, 5, 6, 7, 8, 9]) {
            if (!(await saveStepChildren(step, result.affected_person_id))) return;
          }
        }
        navigate(`/ep/${result.affected_person_id}`);
      }
    } catch (err: unknown) {
      // Backend validation errors come back as { errors: { field: string[] } }
      const apiErr = err as { message?: string; errors?: FieldErrors };
      if (apiErr.errors) {
        setErrors(apiErr.errors);
        // Jump back to the first step only when not already on the final step,
        // so a GPS/GPS-adjacent error keeps the user on step 10 to fix it.
        if (currentStep !== totalSteps) {
          setCurrentStep(1);
        }
      }
    }
  }

  // ── Handle Next: save children for the current step ────────
  async function handleNext() {
    if (isEdit && epId) {
      setChildSaveError(null);
      const ok = await saveStepChildren(currentStep);
      if (!ok) return;
    }
    // Skip Step 9 (Wage Labour) when no business has wage labour.
    const next = currentStep + 1;
    setCurrentStep(Math.min(totalSteps, next === 9 && !hasWageLabour ? 10 : next));
  }

  if (isEdit && loadingEp) {
    return <LoadingSpinner message="Loading EP data..." />;
  }

  if (isEdit && !existing) {
    return <ErrorDisplay message="EP not found." />;
  }

  return (
    <PageLayout
      className={isCorrection ? 'correction-modal' : undefined}
      title={isEdit ? `Edit EP — ${existing?.ep_id ?? ''}` : 'Create New EP'}
      subtitle={
        isCorrection
          ? 'Admin correction of an APPROVED EP — every changed field is saved to Correction History'
          : isEdit
            ? 'Update affected person information (DRAFT only)'
            : `Register a new affected person in project: ${project?.name ?? '—'}`
      }
    >
      {mutationError && (
        <ErrorDisplay
          title="Save failed"
          message={
            mutationError instanceof Error
              ? mutationError.message
              : (mutationError as { message?: string })?.message ?? 'An error occurred'
          }
        />
      )}

      {childSaveError && (
        <ErrorDisplay
          title="Some records could not be saved"
          message={childSaveError}
        />
      )}

      {/* ── Wizard Progress Bar ─────────────────────────────── */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm font-semibold text-gray-800">
            {WIZARD_STEPS[currentStep - 1]?.title}
          </span>
        </div>
        <div className="flex items-center">
          {WIZARD_STEPS.map((step, idx) => (
            <Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-base transition-all ${
                    step.id === 9 && !hasWageLabour && currentStep !== 9
                      ? 'opacity-40 grayscale'
                      : currentStep > step.id
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : currentStep === step.id
                          ? 'bg-white text-blue-600 ring-2 ring-blue-600'
                          : 'bg-gray-100 text-gray-400 ring-1 ring-gray-200'
                  }`}
                >
                  {currentStep > step.id ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step.icon
                  )}
                </div>
              </div>
              {idx < WIZARD_STEPS.length - 1 && (
                <div
                  className={`h-1 min-w-4 flex-1 rounded-full transition-colors ${
                    currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </Fragment>
          ))}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          // Block implicit Enter-key form submission from inputs/selects so
          // typing never accidentally saves the EP and navigates away (e.g.
          // while editing step 10). Saving only happens via explicit buttons.
          if (e.key === 'Enter' && ['INPUT', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
            e.preventDefault();
          }
        }}
        className="space-y-8"
      >
        {/* ── Step 1: Personal Information ─────────────────────────────── */}
        {currentStep === 1 && (
          <>
            {/* Personal Information */}
            <Section title="Personal Information">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="HH ID" error={errors.hh_id}>
                  <input type="text" value={form.hh_id} onChange={(e) => setField('hh_id', e.target.value)} className="form-input" placeholder="Household ID" />
                </Field>
                <Field label="EP ID Number" error={errors.ep_id}>
                  <input
                    type="text"
                    value={form.ep_id}
                    readOnly
                    className="form-input bg-gray-50 text-gray-600"
                    placeholder="Auto-generated after save"
                  />
                </Field>
                <Field label="EP Name" error={errors.name} required>
                  <input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} className="form-input" />
                </Field>
                <Field label="F/H Name" error={errors.father_name}>
                  <input type="text" value={form.father_name} onChange={(e) => setField('father_name', e.target.value)} className="form-input" placeholder="Father / Husband name" />
                </Field>
                <Field label="Mother's Name" error={errors.mother_name}>
                  <input type="text" value={form.mother_name} onChange={(e) => setField('mother_name', e.target.value)} className="form-input" />
                </Field>
                <Field label="Spouse Name" error={errors.spouse_name}>
                  <input type="text" value={form.spouse_name} onChange={(e) => setField('spouse_name', e.target.value)} className="form-input" />
                </Field>
                <Field label="NID No" error={errors.nid_number} required>
                  <input type="text" value={form.nid_number} onChange={(e) => setField('nid_number', e.target.value)} className="form-input" placeholder="10 or 17 digits" />
                </Field>
                <Field label="Mobile No" error={errors.mobile} required>
                  <input type="text" value={form.mobile} onChange={(e) => setField('mobile', e.target.value)} className="form-input" placeholder="01XXXXXXXXX" />
                </Field>
                <Field label="Age" error={errors.age}>
                  <input type="number" min="0" max="150" value={form.age ?? ''} onChange={(e) => setField('age', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                </Field>
                <Field label="Sex" error={errors.gender_id} required>
                  <select value={form.gender_id} onChange={(e) => setField('gender_id', Number(e.target.value))} className="form-select">
                    <option value={0}>Select...</option>
                    {genders.map((g) => (
                      <option key={masterValue(g)} value={masterValue(g)}>{masterLabel(g)}</option>
                    ))}
                  </select>
                </Field>
                {form.gender_id === otherGenderId && (
                  <Field label="Specify Other">
                    <input type="text" value={form.gender_other ?? ''} onChange={(e) => setField('gender_other', e.target.value)} className="form-input" />
                  </Field>
                )}
                <Field label="Date of Birth" error={errors.date_of_birth}>
                  <input type="date" value={form.date_of_birth} onChange={(e) => setField('date_of_birth', e.target.value)} className="form-input" />
                </Field>
                <Field label="Religion" error={errors.religion_id}>
                  <select value={form.religion_id} onChange={(e) => setField('religion_id', Number(e.target.value))} className="form-select">
                    <option value={0}>Select...</option>
                    {religions.map((r) => (
                      <option key={masterValue(r)} value={masterValue(r)}>{masterLabel(r)}</option>
                    ))}
                  </select>
                </Field>
                {form.religion_id === otherReligionId && (
                  <Field label="Specify Other">
                    <input type="text" value={form.religion_other ?? ''} onChange={(e) => setField('religion_other', e.target.value)} className="form-input" />
                  </Field>
                )}
                <Field label="Occupation" error={errors.occupation_id}>
                  <select value={form.occupation_id} onChange={(e) => setField('occupation_id', Number(e.target.value))} className="form-select">
                    <option value={0}>Select...</option>
                    {occupations.map((o) => (
                      <option key={masterValue(o)} value={masterValue(o)}>{masterLabel(o)}</option>
                    ))}
                  </select>
                </Field>
                {form.occupation_id === otherOccupationId && (
                  <Field label="Specify Other">
                    <input type="text" value={form.occupation_other ?? ''} onChange={(e) => setField('occupation_other', e.target.value)} className="form-input" />
                  </Field>
                )}
                <Field label="District" error={errors.district_id} required>
                  <select value={form.district_id} onChange={(e) => handleDistrictChange(e.target.value)} className="form-select">
                    <option value={0}>Select...</option>
                    {districts.map((d) => (
                      <option key={masterValue(d)} value={masterValue(d)}>{masterLabel(d)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Upazila" error={errors.upazila_id} required>
                  <select value={form.upazila_id} onChange={(e) => setField('upazila_id', Number(e.target.value))} className="form-select" disabled={!districtId}>
                    <option value={0}>Select...</option>
                    {upazilas.map((u) => (
                      <option key={masterValue(u)} value={masterValue(u)}>{masterLabel(u)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Project Phase" error={errors.phase}>
                  <select value={form.phase} onChange={(e) => setField('phase', e.target.value)} className="form-select">
                    <option value="">Not specified (00)</option>
                    {projectPhases.map((p) => (
                      <option key={p.epid_code_id} value={p.name}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </Field>
                <Field label="Mouza" error={errors.mouza}>
                  <input type="text" value={form.mouza} onChange={(e) => setField('mouza', e.target.value)} className="form-input" />
                </Field>
                <Field label="Union" error={errors.union_name}>
                  <input type="text" value={form.union_name} onChange={(e) => setField('union_name', e.target.value)} className="form-input" />
                </Field>
                <Field label="HHs Head?" error={errors.is_household_head}>
                  <label className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={form.is_household_head}
                      onChange={(e) => setField('is_household_head', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                </Field>
                <Field label="Total Family Member" error={errors.total_family_member}>
                  <input type="number" min="0" value={form.total_family_member ?? ''} onChange={(e) => setField('total_family_member', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                </Field>
                <Field label="Male" error={errors.male_member}>
                  <input type="number" min="0" value={form.male_member ?? ''} onChange={(e) => setField('male_member', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                </Field>
                <Field label="Female" error={errors.female_member}>
                  <input type="number" min="0" value={form.female_member ?? ''} onChange={(e) => setField('female_member', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                </Field>
                <Field label="Category of Loss" error={errors.category_of_loss}>
                  <select value={form.category_of_loss} onChange={(e) => setField('category_of_loss', e.target.value)} className="form-select">
                    <option value="">Select...</option>
                    {categoryOfLossOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Ownership" error={errors.ownership}>
                  <select value={form.ownership} onChange={(e) => setField('ownership', e.target.value)} className="form-select">
                    <option value="">Select...</option>
                    {OWNERSHIP_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Type Of HH By Structure Loss" error={errors.rc_type_id} required>
                  <select value={form.rc_type_id} onChange={(e) => setField('rc_type_id', Number(e.target.value))} className="form-select">
                    <option value={0}>Select...</option>
                    {rcTypes.map((t) => (
                      <option key={masterValue(t)} value={masterValue(t)}>{masterLabel(t)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="DC Compensation (৳)" error={errors.dc_compensation}>
                  <input type="number" step="0.01" min="0" value={form.dc_compensation ?? ''} onChange={(e) => setField('dc_compensation', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                </Field>
                <Field label="Cheque No" error={errors.cheque_no}>
                  <input type="text" value={form.cheque_no} onChange={(e) => setField('cheque_no', e.target.value)} className="form-input" />
                </Field>
                <Field label="Cheque Date" error={errors.cheque_date}>
                  <input type="date" value={form.cheque_date} onChange={(e) => setField('cheque_date', e.target.value)} className="form-input" />
                </Field>
                <Field label="Yearly Income (BDT)" error={errors.yearly_income}>
                  <input type="number" step="0.01" min="0" value={form.yearly_income ?? ''} onChange={(e) => setField('yearly_income', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                </Field>
                <Field label="Disable" error={errors.is_disabled}>
                  <label className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={form.is_disabled} onChange={(e) => setField('is_disabled', e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                </Field>
                <Field label="Land Less" error={errors.is_landless}>
                  <label className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={form.is_landless} onChange={(e) => setField('is_landless', e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                </Field>
                <Field label="Tribal Peoples" error={errors.is_tribal}>
                  <label className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={form.is_tribal} onChange={(e) => setField('is_tribal', e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                </Field>
                <Field label="Business Loss" error={errors.has_business_loss}>
                  <label className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={form.has_business_loss} onChange={(e) => setField('has_business_loss', e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                </Field>
                <Field label="Tenant" error={errors.is_tenant}>
                  <label className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={form.is_tenant} onChange={(e) => setField('is_tenant', e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                </Field>
                <Field label="Tenant Number" error={errors.total_tenant}>
                  <input type="number" min="0" value={form.total_tenant ?? ''} onChange={(e) => setField('total_tenant', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                </Field>
              </div>
            </Section>
          </>
        )}

        {/* ── Step 2: Family Information ─────────────────────────── */}
        {currentStep === 2 && (
          <Section title="Family Information">
            <p className="mb-4 text-sm text-gray-500">Enter each family member below, then click "Save" to add it to the list. Click "Save &amp; Add More" to keep adding members.</p>

            {/* ── One-line list of saved members ─────────────────── */}
            {familyMembers.length === 0 ? (
              <p className="mb-4 rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">
                No family members added yet.
              </p>
            ) : (
              <div className="mb-5 overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Relationship</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Gender</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Age</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Occupation</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Dependent</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {familyMembers.map((m, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-800">{m.name || '—'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{m.relationship_id === otherRelationshipId ? (m.relationship_other || 'Other') : memberLabel(relationships, m.relationship_id)}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{m.gender_id === otherGenderId ? (m.gender_other || 'Other') : memberLabel(genders, m.gender_id)}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{m.age ?? '—'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{m.occupation_id === otherOccupationId ? (m.occupation_other || 'Other') : memberLabel(occupations, m.occupation_id)}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{m.is_dependent ? 'Yes' : 'No'}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-sm">
                          <button type="button" onClick={() => removeChild(setFamilyMembers, idx)} className="text-xs font-medium text-red-600 hover:text-red-700">
                            ✕ Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── New member input form ──────────────────────────── */}
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700">
                New Family Member {familyMembers.length > 0 ? `#${familyMembers.length + 1}` : ''}
              </h4>
              {newMemberErrors.general && (
                <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600">
                  {newMemberErrors.general[0]}
                </p>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Name">
                  <input type="text" value={newMember.name ?? ''} onChange={(e) => updateNewMember('name', e.target.value)} className="form-input" />
                </Field>
                <Field label="Relationship" required>
                  <select value={newMember.relationship_id} onChange={(e) => updateNewMember('relationship_id', Number(e.target.value))} className="form-select">
                    <option value={0}>Select...</option>
                    {relationships.map((r) => (
                      <option key={masterValue(r)} value={masterValue(r)}>{masterLabel(r)}</option>
                    ))}
                  </select>
                </Field>
                {newMember.relationship_id === otherRelationshipId && (
                  <Field label="Specify Other">
                    <input type="text" value={newMember.relationship_other ?? ''} onChange={(e) => updateNewMember('relationship_other', e.target.value)} className="form-input" />
                  </Field>
                )}
                <Field label="Sex" required>
                  <select value={newMember.gender_id} onChange={(e) => updateNewMember('gender_id', Number(e.target.value))} className="form-select">
                    <option value={0}>Select...</option>
                    {genders.filter((g) => {
                      const n = masterLabel(g).toLowerCase();
                      return n === 'male' || n === 'female';
                    }).map((g) => (
                      <option key={masterValue(g)} value={masterValue(g)}>{masterLabel(g)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Age (in year)">
                  <input type="number" min="0" max="150" value={newMember.age ?? ''} onChange={(e) => updateNewMember('age', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                </Field>
                <Field label="Marital Status">
                  <select value={newMember.marital_status} onChange={(e) => updateNewMember('marital_status', e.target.value)} className="form-select">
                    <option value="">Select...</option>
                    {MARITAL_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Educational Qualification">
                  <select value={newMember.education} onChange={(e) => updateNewMember('education', e.target.value)} className="form-select">
                    <option value="">Select...</option>
                    {EDUCATION_LEVELS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </Field>
                {newMember.education === 'Other' && (
                  <Field label="Specify Other">
                    <input type="text" value={newMember.education_other ?? ''} onChange={(e) => updateNewMember('education_other', e.target.value)} className="form-input" />
                  </Field>
                )}
                <Field label="Do you work">
                  <select value={newMember.does_work === null ? '' : newMember.does_work ? 'yes' : 'no'} onChange={(e) => updateNewMember('does_work', e.target.value === '' ? null : e.target.value === 'yes')} className="form-select">
                    <option value="">Select...</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </Field>
                <Field label="Main Occupation">
                  <select value={newMember.occupation_id} onChange={(e) => updateNewMember('occupation_id', Number(e.target.value))} className="form-select">
                    <option value={0}>Select...</option>
                    {occupations.map((o) => (
                      <option key={masterValue(o)} value={masterValue(o)}>{masterLabel(o)}</option>
                    ))}
                  </select>
                </Field>
                {newMember.occupation_id === otherOccupationId && (
                  <Field label="Specify Other">
                    <input type="text" value={newMember.occupation_other ?? ''} onChange={(e) => updateNewMember('occupation_other', e.target.value)} className="form-input" />
                  </Field>
                )}
                <Field label="Annual Income">
                  <input type="number" min="0" step="0.01" value={newMember.annual_income ?? ''} onChange={(e) => updateNewMember('annual_income', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                </Field>
                <Field label="Health / Disability">
                  <select value={newMember.health_status} onChange={(e) => {
                    updateNewMember('health_status', e.target.value);
                    updateNewMember('disability_type', '');
                  }} className="form-select">
                    <option value="">Select...</option>
                    {HEALTH_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </Field>
                {newMember.health_status === 'Disabled' && (
                  <Field label="Disability Type">
                    <select value={newMember.disability_type} onChange={(e) => updateNewMember('disability_type', e.target.value)} className="form-select">
                      <option value="">Select...</option>
                      {DISABILITY_TYPES.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </Field>
                )}
                <Field label="Dependent?">
                  <label className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={newMember.is_dependent} onChange={(e) => updateNewMember('is_dependent', e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                </Field>
                <Field label="Remarks">
                  <input type="text" value={newMember.remarks} onChange={(e) => updateNewMember('remarks', e.target.value)} className="form-input" />
                </Field>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => saveNewMember()}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => saveNewMember()}
                  className="rounded border border-blue-500 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                >
                  Save &amp; Add More
                </button>
              </div>
            </div>
          </Section>
        )}

        {/* ── Step 3: Land Information ───────────────────────────── */}
        {currentStep === 3 && (
          <Section title="Land Information">
            <p className="mb-4 text-sm text-gray-500">Record each land parcel owned/affected. Fill the form below and click "Save" to add it to the list.</p>
            <EntryListEditor
              title="Land Parcel"
              emptyMessage="No land parcels saved yet."
              entries={lands}
              createEmpty={() => ({ ...emptyLand(), land_status_id: landStatusIdForOwnership })}
              requiredFields={['land_type_id', 'ownership_type_id', 'land_area_unit_id', 'land_use_type_id']}
              onSave={(entry) => { setDirty(true); setLands((prev) => [...prev, entry]); }}
              onRemove={(idx) => { setDirty(true); setLands((prev) => prev.filter((_, i) => i !== idx)); }}
              summaryColumns={[
                { header: 'Type', render: (l) => (l.land_type_id === otherLandTypeId ? (l.land_type_other || 'Other') : memberLabel(landTypes, l.land_type_id)) },
                { header: 'Ownership', render: (l) => (l.ownership_type_id === otherOwnershipTypeId ? (l.ownership_type_other || 'Other') : memberLabel(ownershipTypes, l.ownership_type_id)) },
                { header: 'Mouza', render: (l) => (l.mouza || '—') },
                { header: 'Khatian No', render: (l) => (l.khatian_number || '—') },
                { header: 'Dag No', render: (l) => (l.dag_number || '—') },
                { header: 'LA Case No', render: (l) => (l.la_case_no || '—') },
                { header: 'Area', render: (l) => `${l.land_area} ${l.land_area_unit_id ? memberLabel(units, l.land_area_unit_id) : ''}` },
                { header: 'Use Type', render: (l) => (l.land_use_type_id === otherLandUseTypeId ? (l.land_use_type_other || 'Other') : memberLabel(landUseTypes, l.land_use_type_id)) },
              ]}
              renderFields={(draft, update) => (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Land Type" required>
                    <select value={draft.land_type_id} onChange={(e) => update('land_type_id', Number(e.target.value))} className="form-select">
                      <option value={0}>Select...</option>
                      {landTypes.map((t) => (
                        <option key={masterValue(t)} value={masterValue(t)}>{masterLabel(t)}</option>
                      ))}
                    </select>
                  </Field>
                  {draft.land_type_id === otherLandTypeId && (
                    <Field label="Specify Other">
                      <input type="text" value={draft.land_type_other ?? ''} onChange={(e) => update('land_type_other', e.target.value)} className="form-input" />
                    </Field>
                  )}
                  <Field label="Ownership Type" required>
                    <select value={draft.ownership_type_id} onChange={(e) => update('ownership_type_id', Number(e.target.value))} className="form-select">
                      <option value={0}>Select...</option>
                      {ownershipTypes.map((o) => (
                        <option key={masterValue(o)} value={masterValue(o)}>{masterLabel(o)}</option>
                      ))}
                    </select>
                  </Field>
                  {draft.ownership_type_id === otherOwnershipTypeId && (
                    <Field label="Specify Other">
                      <input type="text" value={draft.ownership_type_other ?? ''} onChange={(e) => update('ownership_type_other', e.target.value)} className="form-input" />
                    </Field>
                  )}
                  <Field label="Mouza">
                    <input type="text" value={draft.mouza} onChange={(e) => update('mouza', e.target.value)} className="form-input" />
                  </Field>
                  <Field label="Khatian No">
                    <input type="text" value={draft.khatian_number} onChange={(e) => update('khatian_number', e.target.value)} className="form-input" />
                  </Field>
                  <Field label="Dag No">
                    <input type="text" value={draft.dag_number} onChange={(e) => update('dag_number', e.target.value)} className="form-input" />
                  </Field>
                  <Field label="LA Case No">
                    <input type="text" value={draft.la_case_no} onChange={(e) => update('la_case_no', e.target.value)} className="form-input" placeholder="e.g. LA Case reference" />
                  </Field>
                  {landStatusIdForOwnership === titleLandStatusId && (
                    <>
                      <Field label="DC Pay Amount (৳)">
                        <input type="number" step="0.01" min="0" value={draft.dc_pay_amount ?? ''} onChange={(e) => update('dc_pay_amount', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                      </Field>
                      <Field label="Cheque No">
                        <input type="text" value={draft.dc_cheque_no} onChange={(e) => update('dc_cheque_no', e.target.value)} className="form-input" />
                      </Field>
                      <Field label="Date">
                        <input type="date" value={draft.dc_pay_date} onChange={(e) => update('dc_pay_date', e.target.value)} className="form-input" />
                      </Field>
                    </>
                  )}
                  <Field label="Land Area" required>
                    <input type="number" step="0.0001" min="0" value={draft.land_area} onChange={(e) => update('land_area', Number(e.target.value))} className="form-input" />
                  </Field>
                  <Field label="Area Unit" required>
                    <select value={draft.land_area_unit_id} onChange={(e) => update('land_area_unit_id', Number(e.target.value))} className="form-select">
                      <option value={0}>Select...</option>
                      {units.map((u) => (
                        <option key={masterValue(u)} value={masterValue(u)}>{masterLabel(u)}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Land Use Type" required>
                    <select value={draft.land_use_type_id} onChange={(e) => update('land_use_type_id', Number(e.target.value))} className="form-select">
                      <option value={0}>Select...</option>
                      {landUseTypes.map((t) => (
                        <option key={masterValue(t)} value={masterValue(t)}>{masterLabel(t)}</option>
                      ))}
                    </select>
                  </Field>
                  {draft.land_use_type_id === otherLandUseTypeId && (
                    <Field label="Specify Other">
                      <input type="text" value={draft.land_use_type_other ?? ''} onChange={(e) => update('land_use_type_other', e.target.value)} className="form-input" />
                    </Field>
                  )}
                  <Field label="Remarks">
                    <input type="text" value={draft.remarks} onChange={(e) => update('remarks', e.target.value)} className="form-input" />
                  </Field>
                </div>
              )}
            />
          </Section>
        )}

        {/* ── Step 4: Crop Information ───────────────────────────── */}
        {currentStep === 4 && (
          <Section title="Crop Information">
            <p className="mb-4 text-sm text-gray-500">Record crops cultivated on each affected land parcel from Step 3.</p>
            {lands.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-700">
                No land parcels saved yet. Go back to Step 3 (Land Information) and save at least one parcel first.
              </p>
            ) : (
              <EntryListEditor
                title="Crop"
                emptyMessage="No crops saved for any parcel yet."
                entries={flatCrops}
                createEmpty={() => ({ ...emptyCrop(), land_id: lands[0]?.land_id ?? 0 })}
                requiredFields={['crop_type_id', 'crop_season_id', 'area_unit_id']}
                onSave={(entry) => {
                  setDirty(true);
                  const landIdx = lands.findIndex((x) => x.land_id === entry.land_id);
                  if (landIdx < 0) return;
                  const next = [...lands];
                  const land = next[landIdx];
                  if (!land) return;
                  next[landIdx] = { ...land, crops: [...land.crops, entry] };
                  setLands(next);
                }}
                onRemove={(ci) => {
                  setDirty(true);
                  const entry = flatCrops[ci];
                  if (!entry) return;
                  const landIdx = lands.findIndex((x) => x.crops.indexOf(entry) !== -1);
                  if (landIdx < 0) return;
                  const next = [...lands];
                  const land = next[landIdx];
                  if (!land) return;
                  next[landIdx] = { ...land, crops: land.crops.filter((crop) => crop !== entry) };
                  setLands(next);
                }}
                summaryColumns={[
                  { header: 'Land Parcel', render: (_crop) => `#{lands.findIndex((x) => x.crops.indexOf(_crop) !== -1) + 1}` },
                  { header: 'Crop', render: (c) => (c.crop_type_id === otherCropTypeId ? (c.crop_type_other || 'Other') : memberLabel(cropTypes, c.crop_type_id)) },
                  { header: 'Season', render: (c) => memberLabel(cropSeasons, c.crop_season_id) },
                  { header: 'Cultivated Area', render: (c) => `${c.cultivated_area} ${c.area_unit_id ? memberLabel(units, c.area_unit_id) : ''}` },
                  { header: 'Damage %', render: (c) => `${c.damage_percentage}%` },
                ]}
                renderFields={(draft, update) => (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Land Parcel" required>
                      <select value={draft.land_id} onChange={(e) => update('land_id', Number(e.target.value))} className="form-select">
                        <option value={0}>Select...</option>
                        {lands.map((x, xi) => (
                          <option key={x.land_id} value={x.land_id}>Land Parcel #{xi + 1}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Crop Type" required>
                      <select value={draft.crop_type_id} onChange={(e) => update('crop_type_id', Number(e.target.value))} className="form-select">
                        <option value={0}>Select...</option>
                        {cropTypes.map((t) => (
                          <option key={masterValue(t)} value={masterValue(t)}>{masterLabel(t)}</option>
                        ))}
                      </select>
                    </Field>
                    {draft.crop_type_id === otherCropTypeId && (
                      <Field label="Specify Other">
                        <input type="text" value={draft.crop_type_other ?? ''} onChange={(e) => update('crop_type_other', e.target.value)} className="form-input" />
                      </Field>
                    )}
                    <Field label="Crop Season" required>
                      <select value={draft.crop_season_id} onChange={(e) => update('crop_season_id', Number(e.target.value))} className="form-select">
                        <option value={0}>Select...</option>
                        {cropSeasons.map((s) => (
                          <option key={masterValue(s)} value={masterValue(s)}>{masterLabel(s)}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Cultivated Area" required>
                      <input type="number" step="0.0001" min="0" value={draft.cultivated_area} onChange={(e) => update('cultivated_area', Number(e.target.value))} className="form-input" />
                    </Field>
                    <Field label="Area Unit" required>
                      <select value={draft.area_unit_id} onChange={(e) => update('area_unit_id', Number(e.target.value))} className="form-select">
                        <option value={0}>Select...</option>
                        {units.map((u) => (
                          <option key={masterValue(u)} value={masterValue(u)}>{masterLabel(u)}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Damage %" required>
                      <input type="number" step="0.01" min="0" max="100" value={draft.damage_percentage} onChange={(e) => update('damage_percentage', Number(e.target.value))} className="form-input" />
                    </Field>
                    <Field label="Remarks">
                      <input type="text" value={draft.remarks} onChange={(e) => update('remarks', e.target.value)} className="form-input" />
                    </Field>
                  </div>
                )}
              />
            )}
          </Section>
        )}

        {/* ── Step 5: Structure Information ──────────────────────── */}
        {currentStep === 5 && (
          <Section title="Structure Information">
            <p className="mb-4 text-sm text-gray-500">Record affected structures/buildings. Fill the form below and click "Save" to add it to the list.</p>
            <EntryListEditor
              title="Structure"
              emptyMessage="No structures saved yet."
              entries={structures}
              createEmpty={emptyStructure}
              requiredFields={['infrastructure_type_id', 'usage_type_id', 'structure_nature', 'structure_material']}
              onSave={(entry) => { setDirty(true); setStructures((prev) => [...prev, entry]); }}
              onRemove={(idx) => { setDirty(true); setStructures((prev) => prev.filter((_, i) => i !== idx)); }}
              summaryColumns={[
                { header: 'Type', render: (s) => (s.infrastructure_type_id === otherInfrastructureTypeId ? (s.infrastructure_type_other || 'Other') : memberLabel(infrastructureTypes, s.infrastructure_type_id)) },
                { header: 'Usage', render: (s) => (s.usage_type_id === otherUsageTypeId ? (s.usage_type_other || 'Other') : memberLabel(usageTypes, s.usage_type_id)) },
                { header: 'Nature', render: (s) => (s.structure_nature || '—') },
                { header: 'Material', render: (s) => (s.structure_material === 'Other' ? (s.structure_material_other || 'Other') : (s.structure_material || '—')) },
                { header: 'Unit', render: (s) => (s.unit || '—') },
                { header: 'Length', render: (s) => (s.length ?? '—') },
                { header: 'Width', render: (s) => (s.width ?? '—') },
                { header: 'Area', render: (s) => s.area_sqft },
                { header: 'Damage %', render: (s) => `${s.damage_percentage}%` },
              ]}
              renderFields={(draft, update) => (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Structure Type" required>
                    <select value={draft.infrastructure_type_id} onChange={(e) => update('infrastructure_type_id', Number(e.target.value))} className="form-select">
                      <option value={0}>Select...</option>
                      {infrastructureTypes.map((t) => (
                        <option key={masterValue(t)} value={masterValue(t)}>{masterLabel(t)}</option>
                      ))}
                    </select>
                  </Field>
                  {draft.infrastructure_type_id === otherInfrastructureTypeId && (
                    <Field label="Specify Other">
                      <input type="text" value={draft.infrastructure_type_other ?? ''} onChange={(e) => update('infrastructure_type_other', e.target.value)} className="form-input" />
                    </Field>
                  )}
                  <Field label="Usage Type" required>
                    <select value={draft.usage_type_id} onChange={(e) => update('usage_type_id', Number(e.target.value))} className="form-select">
                      <option value={0}>Select...</option>
                      {usageTypes.map((t) => (
                        <option key={masterValue(t)} value={masterValue(t)}>{masterLabel(t)}</option>
                      ))}
                    </select>
                  </Field>
                  {draft.usage_type_id === otherUsageTypeId && (
                    <Field label="Specify Other">
                      <input type="text" value={draft.usage_type_other ?? ''} onChange={(e) => update('usage_type_other', e.target.value)} className="form-input" />
                    </Field>
                  )}
                  <Field label="Structure Nature (Primary/Secondary)" required>
                    <select value={draft.structure_nature} onChange={(e) => update('structure_nature', e.target.value)} className="form-select">
                      <option value="">Select...</option>
                      <option value="Primary">Primary</option>
                      <option value="Secondary">Secondary</option>
                    </select>
                  </Field>
                  <Field label="Structure Material" required>
                    <select value={draft.structure_material} onChange={(e) => update('structure_material', e.target.value)} className="form-select">
                      <option value="">Select...</option>
                      <option value="Pacca">Pacca</option>
                      <option value="Semi Pacca">Semi Pacca</option>
                      <option value="Tin Made">Tin Made</option>
                      <option value="Katcha">Katcha</option>
                      <option value="Thatched">Thatched</option>
                      <option value="Other">Other</option>
                    </select>
                  </Field>
                  {draft.structure_material === 'Other' && (
                    <Field label="Specify Other Material" required>
                      <input type="text" value={draft.structure_material_other ?? ''} onChange={(e) => update('structure_material_other', e.target.value)} className="form-input" />
                    </Field>
                  )}
                  <Field label="Unit">
                    <select value={draft.unit} onChange={(e) => update('unit', e.target.value)} className="form-select">
                      <option value="">Select...</option>
                      <option value="SFT">SFT</option>
                      <option value="CFT">CFT</option>
                      <option value="RFT">RFT</option>
                      <option value="Number">Number</option>
                    </select>
                  </Field>
                  <Field label="Length (ft)">
                    <input type="number" step="0.01" min="0" value={draft.length ?? ''} onChange={(e) => update('length', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                  </Field>
                  <Field label="Width (ft)">
                    <input type="number" step="0.01" min="0" value={draft.width ?? ''} onChange={(e) => update('width', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                  </Field>
                  <Field label="Area (sq ft)" required>
                    <input type="number" step="0.01" min="0" value={draft.area_sqft} onChange={(e) => update('area_sqft', Number(e.target.value))} className="form-input" />
                  </Field>
                  <Field label="Damage %" required>
                    <input type="number" step="0.01" min="0" max="100" value={draft.damage_percentage} onChange={(e) => update('damage_percentage', Number(e.target.value))} className="form-input" />
                  </Field>
                  <Field label="Remarks">
                    <input type="text" value={draft.remarks} onChange={(e) => update('remarks', e.target.value)} className="form-input" />
                  </Field>
                </div>
              )}
            />
            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-5">
              <h4 className="mb-1 text-sm font-semibold text-gray-700">DC Structure Compensation</h4>
              <p className="mb-4 text-xs text-gray-500">Total structural compensation approved by DC for this EP (not per structure).</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="DC Compensation (৳)">
                  <input type="number" step="0.01" min="0" value={form.dc_compensation ?? ''} onChange={(e) => setField('dc_compensation', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                </Field>
                <Field label="Cheque No">
                  <input type="text" value={form.cheque_no} onChange={(e) => setField('cheque_no', e.target.value)} className="form-input" />
                </Field>
                <Field label="Date">
                  <input type="date" value={form.cheque_date} onChange={(e) => setField('cheque_date', e.target.value)} className="form-input" />
                </Field>
              </div>
            </div>
          </Section>
        )}

        {/* ── Step 6: Tree Information ───────────────────────────── */}
        {currentStep === 6 && (
          <Section title="Tree Information">
            <p className="mb-4 text-sm text-gray-500">
              Record affected trees. Enter the tree name, choose its type, then give a quantity for each size — one tree with different sizes can be saved in a single row.
            </p>

            {/* ── One-line list of saved trees ─────────────────── */}
            {trees.length === 0 ? (
              <p className="mb-4 rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">
                No trees saved yet.
              </p>
            ) : (
              <div className="mb-5 overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Name of Tree</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Tree Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Land Ownership</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Size</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Quantity</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Remarks</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {trees.map((t, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-800">{t.name || '—'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{memberLabel(treeTypes, t.tree_type_id)}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{t.land_ownership || '—'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{memberLabel(treeAgeCategories, t.tree_age_category_id)}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{t.quantity}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">{t.remarks || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-sm">
                          <button type="button" onClick={() => removeChild(setTrees, idx)} className="text-xs font-medium text-red-600 hover:text-red-700">
                            ✕ Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── New tree input form ───────────────────────────── */}
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700">
                New Tree {trees.length > 0 ? `#${trees.length + 1}` : ''}
              </h4>
              {newTreeErrors.general && (
                <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600">
                  {newTreeErrors.general[0]}
                </p>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Name of Tree">
                  <input
                    type="text"
                    value={newTree.name}
                    onChange={(e) => updateNewTree('name', e.target.value)}
                    className="form-input"
                    placeholder="e.g. Mango, Jackfruit, Mahogany"
                  />
                </Field>
                <Field label="Land Ownership">
                  <select value={newTree.land_ownership} onChange={(e) => updateNewTree('land_ownership', e.target.value)} className="form-select">
                    <option value="">Select...</option>
                    {TREE_LAND_OWNERSHIP_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Tree Type" required>
                  <select value={newTree.tree_type_id} onChange={(e) => updateNewTree('tree_type_id', Number(e.target.value))} className="form-select">
                    <option value={0}>Select...</option>
                    {treeTypes.map((tt) => (
                      <option key={masterValue(tt)} value={masterValue(tt)}>{masterLabel(tt)}</option>
                    ))}
                  </select>
                </Field>
                {treeAgeCategories.map((cat) => (
                  <Field key={masterValue(cat)} label={`Quantity — ${masterLabel(cat)}`}>
                    <input
                      type="number"
                      min="0"
                      value={newTree.quantities[masterValue(cat)] ?? 0}
                      onChange={(e) => setNewTreeQuantity(masterValue(cat), Number(e.target.value))}
                      className="form-input"
                      placeholder="0"
                    />
                  </Field>
                ))}
                <Field label="Remarks">
                  <input type="text" value={newTree.remarks} onChange={(e) => updateNewTree('remarks', e.target.value)} className="form-input" />
                </Field>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => saveNewTree()}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => saveNewTree()}
                  className="rounded border border-blue-500 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                >
                  Save &amp; Add More
                </button>
              </div>
            </div>
            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-5">
              <h4 className="mb-1 text-sm font-semibold text-gray-700">DC Tree Compensation</h4>
              <p className="mb-4 text-xs text-gray-500">Total tree compensation approved by DC for this EP (not per tree).</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="DC Compensation (৳)">
                  <input type="number" step="0.01" min="0" value={form.dc_tree_compensation ?? ''} onChange={(e) => setField('dc_tree_compensation', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                </Field>
                <Field label="Cheque No">
                  <input type="text" value={form.dc_tree_cheque_no} onChange={(e) => setField('dc_tree_cheque_no', e.target.value)} className="form-input" />
                </Field>
                <Field label="Date">
                  <input type="date" value={form.dc_tree_cheque_date} onChange={(e) => setField('dc_tree_cheque_date', e.target.value)} className="form-input" />
                </Field>
              </div>
            </div>
          </Section>
        )}

        {/* ── Step 7: Tenant Information ─────────────────────────── */}
        {currentStep === 7 && (
          <Section title="Tenant Information">
            <p className="mb-4 text-sm text-gray-500">Record tenants occupying affected structures. HH ID is taken from the EP's Personal Information; EP ID No is generated automatically on save. Fill the form below and click "Save" to add them to the list.</p>
            <EntryListEditor
              title="Tenant"
              emptyMessage="No tenants saved yet."
              entries={tenants}
              createEmpty={emptyTenant}
              requiredFields={['tenant_type_id', 'name']}
              onSave={(entry) => { setDirty(true); setTenants((prev) => [...prev, entry]); }}
              onRemove={(idx) => { setDirty(true); setTenants((prev) => prev.filter((_, i) => i !== idx)); }}
              summaryColumns={[
                { header: 'EP ID No', render: (t) => (t.ep_id || '—') },
                { header: 'HH ID', render: (t) => (t.hh_id || form.hh_id || '—') },
                { header: 'Tenant Name', render: (t) => t.name },
                { header: 'Type', render: (t) => memberLabel(tenantTypes, t.tenant_type_id) },
                { header: 'Structure SL', render: (t) => {
                    const idxs = Array.isArray(t.structure_idxs) ? t.structure_idxs.map(Number) : [];
                    const idx = t.structure_idx && t.structure_idx >= 0
                      ? Number(t.structure_idx)
                      : idxs.length
                        ? (idxs[0] ?? -1)
                        : t.infrastructure_id
                          ? structures.findIndex((s) => s.infrastructure_id === t.infrastructure_id)
                          : -1;
                    if (idxs.length > 0) return idxs.map((i) => `SL ${i + 1}`).join(', ');
                    if (t.infrastructure_ids && (t.infrastructure_ids as number[]).length) {
                      return t.infrastructure_ids.map((id) => {
                        const si = structures.findIndex((s) => s.infrastructure_id === id);
                        return si >= 0 ? `SL ${si + 1}` : `#${id}`;
                      }).join(', ');
                    }
                    return idx >= 0 ? `SL ${idx + 1}` : '—';
                  } },
                { header: 'Occupation', render: (t) => (t.occupation_id === otherOccupationId ? (t.occupation_other || 'Other') : memberLabel(occupations, t.occupation_id)) },
                { header: 'Annual Income', render: (t) => (t.annual_income ? `৳${t.annual_income}` : '—') },
                { header: 'Mobile', render: (t) => (t.mobile || '—') },
              ]}
              renderFields={(draft, update) => (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="HH ID">
                    <input type="text" value={form.hh_id || '—'} readOnly className="form-input bg-gray-100" />
                  </Field>
                  <Field label="EP ID No">
                    <input type="text" value={draft.ep_id || 'Auto generated on save'} readOnly className="form-input bg-gray-100" />
                  </Field>
                  <Field label="Tenant Name" required>
                    <input type="text" value={draft.name} onChange={(e) => update('name', e.target.value)} className="form-input" />
                  </Field>
                  <Field label="Father Name">
                    <input type="text" value={draft.father_name} onChange={(e) => update('father_name', e.target.value)} className="form-input" />
                  </Field>
                  <Field label="NID No">
                    <input type="text" value={draft.nid_number} onChange={(e) => update('nid_number', e.target.value)} className="form-input" />
                  </Field>
                  <Field label="Mobile No">
                    <input type="text" value={draft.mobile} onChange={(e) => update('mobile', e.target.value)} className="form-input" />
                  </Field>
                  <Field label="Mouza">
                    <input type="text" value={draft.mouza} onChange={(e) => update('mouza', e.target.value)} className="form-input" />
                  </Field>
                  <Field label="Union">
                    <input type="text" value={draft.union_name} onChange={(e) => update('union_name', e.target.value)} className="form-input" />
                  </Field>
                  <Field label="District">
                    <select value={draft.district_id} onChange={(e) => update('district_id', Number(e.target.value))} className="form-select">
                      <option value={0}>Select...</option>
                      {districts.map((d) => (
                        <option key={masterValue(d)} value={masterValue(d)}>{masterLabel(d)}</option>
                      ))}
                    </select>
                  </Field>
                  <TenantUpazilaField
                    districtId={draft.district_id}
                    value={draft.upazila_id}
                    onSelect={(v) => update('upazila_id', v)}
                  />
                  <Field label="Type of Tenant" required>
                    <select value={draft.tenant_type_id} onChange={(e) => update('tenant_type_id', Number(e.target.value))} className="form-select">
                      <option value={0}>Select...</option>
                      {tenantTypes.map((tt) => (
                        <option key={masterValue(tt)} value={masterValue(tt)}>{masterLabel(tt)}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Occupation">
                    <select value={draft.occupation_id} onChange={(e) => update('occupation_id', Number(e.target.value))} className="form-select">
                      <option value={0}>Select...</option>
                      {occupations.map((o) => (
                        <option key={masterValue(o)} value={masterValue(o)}>{masterLabel(o)}</option>
                      ))}
                    </select>
                  </Field>
                  {draft.occupation_id === otherOccupationId && (
                    <Field label="Specify Occupation">
                      <input type="text" value={draft.occupation_other ?? ''} onChange={(e) => update('occupation_other', e.target.value)} className="form-input" placeholder="Type the occupation" />
                    </Field>
                  )}
                  <Field label="Rented Structure(s) — Sl No">
                    <div className="flex flex-col gap-1.5 rounded border border-gray-300 bg-white px-3 py-2">
                      {structures.length === 0 && (
                        <span className="text-xs text-gray-400">No structures saved yet — save Step 5 first</span>
                      )}
                      {structures.map((s, idx) => {
                        const selected = Array.isArray(draft.structure_idxs) ? draft.structure_idxs.map(Number) : [];
                        const checked = selected.includes(idx);
                        return (
                          <label key={`${s.infrastructure_id || 'new'}-${idx}`} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked ? selected.filter((i) => i !== idx) : [...selected, idx];
                                update('structure_idxs', next.sort((a, b) => a - b));
                              }}
                              className="rounded"
                            />
                            {`SL ${idx + 1} — ${s.infrastructure_type_id === otherInfrastructureTypeId ? (s.infrastructure_type_other || 'Other') : memberLabel(infrastructureTypes, s.infrastructure_type_id)}`}
                          </label>
                        );
                      })}
                    </div>
                  </Field>
                  <Field label="Age">
                    <input type="number" min="0" value={draft.age ?? ''} onChange={(e) => update('age', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                  </Field>
                  <Field label="Sex">
                    <select value={draft.gender_id} onChange={(e) => update('gender_id', Number(e.target.value))} className="form-select">
                      <option value={0}>Select...</option>
                      {genders.map((g) => (
                        <option key={masterValue(g)} value={masterValue(g)}>{masterLabel(g)}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Annual Income (৳)">
                    <input type="number" min="0" step="0.01" value={draft.annual_income ?? ''} onChange={(e) => update('annual_income', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                  </Field>
                </div>
              )}
            />
          </Section>
        )}

        {/* ── Step 8: Business Information ───────────────────────── */}
        {currentStep === 8 && (
          <Section title="Business Information">
            <p className="mb-4 text-sm text-gray-500">Record affected businesses. Fill the form below and click "Save" to add it to the list.</p>
            <EntryListEditor
              title="Business"
              emptyMessage="No businesses saved yet."
              entries={businesses}
              createEmpty={emptyBusiness}
              requiredFields={['business_ownership_type_id', 'business_type_id', 'business_category_id', 'business_name', 'capital_amount']}
              onSave={(entry) => { setDirty(true); setBusinesses((prev) => [...prev, entry]); }}
              onRemove={(idx) => { setDirty(true); setBusinesses((prev) => prev.filter((_, i) => i !== idx)); }}
              summaryColumns={[
                { header: 'Name', render: (b) => b.business_name },
                { header: 'Type', render: (b) => (b.business_type_id === otherBusinessTypeId ? (b.business_type_other || 'Other') : memberLabel(businessTypes, b.business_type_id)) },
                { header: 'Category', render: (b) => memberLabel(businessCategories, b.business_category_id) },
                { header: 'Ownership', render: (b) => memberLabel(businessOwnershipTypes, b.business_ownership_type_id) },
                { header: 'Capital (৳)', render: (b) => b.capital_amount },
                { header: 'Wage Labour', render: (b) => (b.has_wage_labour ? (b.number_of_wage_labour ?? 'Yes') : 'No') },
              ]}
              renderFields={(draft, update) => (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Ownership Type" required>
                    <select value={draft.business_ownership_type_id} onChange={(e) => update('business_ownership_type_id', Number(e.target.value))} className="form-select">
                      <option value={0}>Select...</option>
                      {businessOwnershipTypes.map((o) => (
                        <option key={masterValue(o)} value={masterValue(o)}>{masterLabel(o)}</option>
                      ))}
                    </select>
                  </Field>
                  {draft.business_ownership_type_id === tenantBusinessOwnershipTypeId && (
                    <Field label="Tenant" required>
                      <select value={draft.tenant_id ?? ''} onChange={(e) => update('tenant_id', e.target.value ? Number(e.target.value) : null)} className="form-select">
                        <option value="">Select...</option>
                        {tenants.map((t) => (
                          <option key={t.tenant_id || `new-${t.name}`} value={t.tenant_id}>{t.name}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <Field label="Business Type" required>
                    <select value={draft.business_type_id} onChange={(e) => update('business_type_id', Number(e.target.value))} className="form-select">
                      <option value={0}>Select...</option>
                      {businessTypes.map((t) => (
                        <option key={masterValue(t)} value={masterValue(t)}>{masterLabel(t)}</option>
                      ))}
                    </select>
                  </Field>
                  {draft.business_type_id === otherBusinessTypeId && (
                    <Field label="Specify Other">
                      <input type="text" value={draft.business_type_other ?? ''} onChange={(e) => update('business_type_other', e.target.value)} className="form-input" />
                    </Field>
                  )}
                  <Field label="Business Category" required>
                    <select value={draft.business_category_id} onChange={(e) => update('business_category_id', Number(e.target.value))} className="form-select">
                      <option value={0}>Select...</option>
                      {businessCategories.map((c) => (
                        <option key={masterValue(c)} value={masterValue(c)}>{masterLabel(c)}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Business Name" required>
                    <input type="text" value={draft.business_name} onChange={(e) => update('business_name', e.target.value)} className="form-input" />
                  </Field>
                  <Field label="Present Address">
                    <input type="text" value={draft.present_address} onChange={(e) => update('present_address', e.target.value)} className="form-input" />
                  </Field>
                  <Field label="Capital Amount (৳)" required>
                    <input type="number" step="0.01" min="0" value={draft.capital_amount} onChange={(e) => update('capital_amount', Number(e.target.value))} className="form-input" />
                  </Field>
                  <Field label="Annual Income (৳)">
                    <input type="number" step="0.01" min="0" value={draft.annual_income ?? ''} onChange={(e) => update('annual_income', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                  </Field>
                  <Field label="Have Wage Labour?">
                    <label className="flex items-center gap-2 mt-2">
                      <input type="checkbox" checked={draft.has_wage_labour} onChange={(e) => update('has_wage_labour', e.target.checked)} className="rounded" />
                      <span className="text-sm text-gray-700">Yes</span>
                    </label>
                  </Field>
                  {draft.has_wage_labour && (
                    <Field label="No. of Wage Labour" required>
                      <input type="number" min="0" value={draft.number_of_wage_labour ?? ''} onChange={(e) => update('number_of_wage_labour', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                    </Field>
                  )}
                  <Field label="Has Income Tax?">
                    <label className="flex items-center gap-2 mt-2">
                      <input type="checkbox" checked={draft.has_income_tax} onChange={(e) => update('has_income_tax', e.target.checked)} className="rounded" />
                      <span className="text-sm text-gray-700">Yes</span>
                    </label>
                  </Field>
                  {draft.has_income_tax && (
                    <Field label="Income Tax ID" required>
                      <input type="text" value={draft.income_tax_id} onChange={(e) => update('income_tax_id', e.target.value)} className="form-input" />
                    </Field>
                  )}
                  <Field label="Remarks">
                    <input type="text" value={draft.remarks} onChange={(e) => update('remarks', e.target.value)} className="form-input" />
                  </Field>
                </div>
              )}
            />
          </Section>
        )}

        {/* ── Step 9: Wage Labour Information ────────────────────── */}
        {currentStep === 9 && !hasWageLabour && (
          <Section title="Wage Labour Information">
            <p className="mb-4 text-sm text-gray-500">
              This step is only shown when at least one business is marked as having wage labour.
              Go back to Step 8 (Business Information), tick "Have Wage Labour?" on a business and save it.
            </p>
          </Section>
        )}
        {currentStep === 9 && hasWageLabour && (
          <Section title="Wage Labour Information">
            <p className="mb-4 text-sm text-gray-500">Record wage labourers/workers affected. Their EP ID No is generated automatically on save (starts from #0001). Fill the form below and click "Save" to add them to the list.</p>
            <EntryListEditor
              title="Worker"
              emptyMessage="No workers saved yet."
              entries={workers}
              createEmpty={emptyWorker}
              requiredFields={['name', 'gender_id']}
              onSave={(entry) => { setDirty(true); setWorkers((prev) => [...prev, entry]); }}
              onRemove={(idx) => { setDirty(true); setWorkers((prev) => prev.filter((_, i) => i !== idx)); }}
              summaryColumns={[
                { header: 'EP ID No', render: (w) => (w.ep_id || '—') },
                { header: 'Business Owner', render: (w) => (businesses.find((b) => b.business_id === w.business_id)?.business_name ?? '—') },
                { header: 'Name', render: (w) => w.name },
                { header: 'Gender', render: (w) => (w.gender_id === otherGenderId ? (w.gender_other || 'Other') : memberLabel(genders, w.gender_id)) },
                { header: 'Age', render: (w) => (w.age ?? '—') },
                { header: 'Employment', render: (w) => (w.employment_type_id === otherEmploymentTypeId ? (w.employment_type_other || 'Other') : memberLabel(employmentTypes, w.employment_type_id)) },
                { header: 'Monthly Income (৳)', render: (w) => w.monthly_income },
              ]}
              renderFields={(draft, update) => (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="EP ID No">
                    <input type="text" value={draft.ep_id || 'Auto generated on save'} readOnly className="form-input bg-gray-100" />
                  </Field>
                  <Field label="Business Owner">
                    <select value={draft.business_id} onChange={(e) => update('business_id', Number(e.target.value))} className="form-select">
                      <option value={0}>Select...</option>
                      {businesses.map((b, i) => (
                        <option key={b.business_id ? b.business_id : `new-${i}`} value={b.business_id}>{b.business_name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Name" required>
                    <input type="text" value={draft.name} onChange={(e) => update('name', e.target.value)} className="form-input" />
                  </Field>
                  <Field label="Father's Name">
                    <input type="text" value={draft.father_name} onChange={(e) => update('father_name', e.target.value)} className="form-input" />
                  </Field>
                  <Field label="Mobile No">
                    <input type="text" value={draft.mobile} onChange={(e) => update('mobile', e.target.value)} className="form-input" />
                  </Field>
                  <Field label="NID No">
                    <input type="text" value={draft.nid_number} onChange={(e) => update('nid_number', e.target.value)} className="form-input" />
                  </Field>
                  <Field label="Mouza">
                    <input type="text" value={draft.mouza} onChange={(e) => update('mouza', e.target.value)} className="form-input" />
                  </Field>
                  <Field label="Union">
                    <input type="text" value={draft.union_name} onChange={(e) => update('union_name', e.target.value)} className="form-input" />
                  </Field>
                  <Field label="District">
                    <select value={draft.district_id} onChange={(e) => update('district_id', Number(e.target.value))} className="form-select">
                      <option value={0}>Select...</option>
                      {districts.map((d) => (
                        <option key={masterValue(d)} value={masterValue(d)}>{masterLabel(d)}</option>
                      ))}
                    </select>
                  </Field>
                  <TenantUpazilaField
                    districtId={draft.district_id}
                    value={draft.upazila_id}
                    onSelect={(v) => update('upazila_id', v)}
                  />
                  <Field label="Total Family Member">
                    <input type="number" min="0" max="200" value={draft.total_family_member ?? ''} onChange={(e) => update('total_family_member', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                  </Field>
                  <Field label="Duration of Employment (Month)">
                    <input type="number" min="0" max="1200" value={draft.duration_of_employment_month ?? ''} onChange={(e) => update('duration_of_employment_month', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                  </Field>
                  <Field label="Gender" required>
                    <select value={draft.gender_id} onChange={(e) => update('gender_id', Number(e.target.value))} className="form-select">
                      <option value={0}>Select...</option>
                      {genders.map((g) => (
                        <option key={masterValue(g)} value={masterValue(g)}>{masterLabel(g)}</option>
                      ))}
                    </select>
                  </Field>
                  {draft.gender_id === otherGenderId && (
                    <Field label="Specify Other">
                      <input type="text" value={draft.gender_other ?? ''} onChange={(e) => update('gender_other', e.target.value)} className="form-input" />
                    </Field>
                  )}
                  <Field label="Age">
                    <input type="number" min="0" max="150" value={draft.age ?? ''} onChange={(e) => update('age', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
                  </Field>
                  <Field label="Occupation">
                    <select value={draft.occupation_id} onChange={(e) => update('occupation_id', Number(e.target.value))} className="form-select">
                      <option value={0}>Select...</option>
                      {occupations.map((o) => (
                        <option key={masterValue(o)} value={masterValue(o)}>{masterLabel(o)}</option>
                      ))}
                    </select>
                  </Field>
                  {draft.occupation_id === otherOccupationId && (
                    <Field label="Specify Other">
                      <input type="text" value={draft.occupation_other ?? ''} onChange={(e) => update('occupation_other', e.target.value)} className="form-input" />
                    </Field>
                  )}
                  <Field label="Employment Type">
                    <select value={draft.employment_type_id} onChange={(e) => update('employment_type_id', Number(e.target.value))} className="form-select">
                      <option value={0}>Select...</option>
                      {employmentTypes.map((t) => (
                        <option key={masterValue(t)} value={masterValue(t)}>{masterLabel(t)}</option>
                      ))}
                    </select>
                  </Field>
                  {draft.employment_type_id === otherEmploymentTypeId && (
                    <Field label="Specify Other">
                      <input type="text" value={draft.employment_type_other ?? ''} onChange={(e) => update('employment_type_other', e.target.value)} className="form-input" />
                    </Field>
                  )}
                  <Field label="Monthly Income (৳)" required>
                    <input type="number" step="0.01" min="0" value={draft.monthly_income} onChange={(e) => update('monthly_income', Number(e.target.value))} className="form-input" />
                  </Field>
                  <Field label="Remarks">
                    <input type="text" value={draft.remarks} onChange={(e) => update('remarks', e.target.value)} className="form-input" />
                  </Field>
                </div>
              )}
            />
          </Section>
        )}

        {/* ── Step 10: GPS Location ─────────────────────────────── */}
        {currentStep === 10 && (
          <Section title="GPS Location">
            <p className="mb-4 text-sm text-gray-500">One GPS location for this EP.</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="GPS Latitude">
                <input type="number" step="0.0000001" value={form.gps_latitude ?? ''} onChange={(e) => setField('gps_latitude', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
              </Field>
              <Field label="GPS Longitude">
                <input type="number" step="0.0000001" value={form.gps_longitude ?? ''} onChange={(e) => setField('gps_longitude', e.target.value === '' ? null : Number(e.target.value))} className="form-input" />
              </Field>
            </div>
          </Section>
        )}

        {/* ── Navigation Buttons ────────────────────────────────── */}
        <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white/95 backdrop-blur p-6 shadow-lg">
          {/* Previous Button */}
          <button
            type="button"
            onClick={() => {
              // Skip Step 9 (Wage Labour) when no business has wage labour.
              const prev = currentStep - 1;
              setCurrentStep(Math.max(1, prev === 9 && !hasWageLabour ? 8 : prev));
            }}
            disabled={currentStep === 1}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            ← Previous
          </button>

          {/* Progress Text */}
          <div className="text-center text-sm text-gray-600">
            Step {currentStep} of {totalSteps}
          </div>

          {/* Next/Submit Button */}
          <div className="flex items-center gap-3">
            {isEdit && dirty && (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <span>{isPending ? '⏳ Saving...' : '✏️ Update'}</span>
              </button>
            )}
            {currentStep === totalSteps && !(isEdit && dirty) ? (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <span>{isPending ? '⏳ Saving...' : isEdit ? '✏️ Update EP' : '✚ Create EP'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </form>
    </PageLayout>
  );
}

// ── Helper Components ────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-gray-300">
      <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
        <div className="h-0.5 w-1 rounded-full bg-blue-600"></div>
        <h3 className="text-lg font-semibold text-gray-800 tracking-tight">{title}</h3>
      </div>
      <div className="space-y-0">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string[];
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700 leading-tight">
        {label}
        {required && <span className="ml-1 text-red-500 font-semibold">*</span>}
      </label>
      <div className="relative">
        {children}
      </div>
      {error && error.length > 0 && (
        <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
          <span>⚠</span> {error[0]}
        </p>
      )}
    </div>
  );
}
