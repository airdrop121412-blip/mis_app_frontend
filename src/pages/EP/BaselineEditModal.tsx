// ═══════════════════════════════════════════════════════════════
// BaselineEditModal — popup editor for a single Baseline row.
//
// Clicking "Edit" on any Baseline table opens this modal, fetches the
// full record from the nested EP API (GET /api/v1/ep/{ep}/{resource}/{id}),
// and renders a field-by-field form. Saving sends a PUT to the same
// nested resource and invalidates the baseline + EP-scoped queries.
//
// ✎ Relationships/Genders/etc. are loaded through the same master hooks
// the EP wizard uses, so the popup matches the real editor's options.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BaselineRow } from '../../api/baseline';
import type { CrudField } from '../../components/ep/NestedCrud';
import type { MasterItem } from '../../types/ep';
import { useInfrastructures } from '../../hooks/useEp';
import {
  useRelationships, useGenders, useOccupations, useDistricts, useAllUpazilas,
  useReligions, useLocationSources,
  useLandTypes, useLandStatuses, useOwnershipTypes, useUnits, useLandUseTypes,
  useCropTypes, useCropSeasons,
  useTreeTypes, useTreeAgeCategories,
  useInfrastructureTypes, useUsageTypes, useTenantTypes,
  useEmploymentTypes, useBusinessTypes, useBusinessCategories, useBusinessOwnershipTypes,
} from '../../hooks/useMasters';
import {
  getEp, updateEp,
  getFamilyMember, updateFamilyMember,
  getLand, updateLand,
  getTree, updateTree,
  getInfrastructure, updateInfrastructure,
  getTenant, updateTenant,
  getWorker, updateWorker,
  getBusiness, updateBusiness,
  getCrop, updateCrop,
  listBusinesses,
} from '../../api/ep';
import { LoadingSpinner } from '../../components/LoadingSpinner';

type FormValue = string | number | boolean | (string | number)[];

/** Map master items to { value, label } options for form selects. */
function toOptions(items: MasterItem[]): { value: number; label: string }[] {
  return items.map((item) => {
    const pk = Object.keys(item).find((k) => k.endsWith('_id') && k !== 'district_id' && k !== 'upazila_id');
    const raw = item.id ?? (pk ? item[pk] : null);
    return { value: Number(raw ?? 0), label: String(item.name ?? item.code ?? '—') };
  });
}

const num = (v: unknown): number => Number(v ?? 0);

function idOf(row: BaselineRow, keys: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const k of keys) map[k] = num(row[k]);
  return map;
}

interface BaselineEditModalProps {
  sectionId: string;
  sectionTitle: string;
  emoji?: string;
  row: BaselineRow;
  onClose: () => void;
}

interface EditorDispatch {
  idKeys: string[];
  get: (apId: number, ids: Record<string, unknown>) => Promise<unknown>;
  update: (apId: number, ids: Record<string, unknown>, data: Record<string, unknown>) => Promise<unknown>;
  recordIdText: (apId: number, ids: Record<string, unknown>) => string;
}

function editorFor(sectionId: string): EditorDispatch {
  switch (sectionId) {
    case 'eps':
    case 'gps':
      return {
        idKeys: ['affected_person_id'],
        get: (apId) => getEp(apId),
        update: (apId, _ids, data) => updateEp(apId, data),
        recordIdText: (apId) => String(apId),
      };
    case 'family-members':
      return {
        idKeys: ['affected_person_id', 'family_member_id'],
        get: (apId, d) => getFamilyMember(apId, num(d.family_member_id)),
        update: (apId, d, data) => updateFamilyMember(apId, num(d.family_member_id), data),
        recordIdText: (_apId, d) => String(d.family_member_id ?? ''),
      };
    case 'lands':
      return {
        idKeys: ['affected_person_id', 'land_id'],
        get: (apId, d) => getLand(apId, num(d.land_id)),
        update: (apId, d, data) => updateLand(apId, num(d.land_id), data),
        recordIdText: (_apId, d) => String(d.land_id ?? ''),
      };
    case 'crops':
      return {
        idKeys: ['affected_person_id', 'land_id', 'crop_id'],
        get: (apId, d) => getCrop(apId, num(d.land_id), num(d.crop_id)),
        update: (apId, d, data) => updateCrop(apId, num(d.land_id), num(d.crop_id), data),
        recordIdText: (_apId, d) => String(d.crop_id ?? ''),
      };
    case 'infrastructures':
      return {
        idKeys: ['affected_person_id', 'infrastructure_id'],
        get: (apId, d) => getInfrastructure(apId, num(d.infrastructure_id)),
        update: (apId, d, data) => updateInfrastructure(apId, num(d.infrastructure_id), data),
        recordIdText: (_apId, d) => String(d.infrastructure_id ?? ''),
      };
    case 'trees':
      return {
        idKeys: ['affected_person_id', 'tree_id'],
        get: (apId, d) => getTree(apId, num(d.tree_id)),
        update: (apId, d, data) => updateTree(apId, num(d.tree_id), data),
        recordIdText: (_apId, d) => String(d.tree_id ?? ''),
      };
    case 'tenants':
      return {
        idKeys: ['affected_person_id', 'tenant_id'],
        get: (apId, d) => getTenant(apId, num(d.tenant_id)),
        update: (apId, d, data) => updateTenant(apId, num(d.tenant_id), data),
        recordIdText: (_apId, d) => String(d.tenant_id ?? ''),
      };
    case 'businesses':
      return {
        idKeys: ['affected_person_id', 'business_id'],
        get: (apId, d) => getBusiness(apId, num(d.business_id)),
        update: (apId, d, data) => updateBusiness(apId, num(d.business_id), data),
        recordIdText: (_apId, d) => String(d.business_id ?? ''),
      };
    case 'workers':
      return {
        idKeys: ['affected_person_id', 'worker_id'],
        get: (apId, d) => getWorker(apId, num(d.worker_id)),
        update: (apId, d, data) => updateWorker(apId, num(d.worker_id), data),
        recordIdText: (_apId, d) => String(d.worker_id ?? ''),
      };
    default:
      return {
        idKeys: [],
        get: async () => ({}),
        update: async () => ({}),
        recordIdText: () => '',
      };
  }
}

export function BaselineEditModal({ sectionId, sectionTitle, emoji, row, onClose }: BaselineEditModalProps) {
  const qc = useQueryClient();
  const apId = num(row.affected_person_id ?? 0);
  const editor = editorFor(sectionId);

  // ── Master options (unconditional hook calls) ───────────────
  const { items: relationships } = useRelationships();
  const { items: genders } = useGenders();
  const { items: occupations } = useOccupations();
  const { items: religions } = useReligions();
  const { items: locationSources } = useLocationSources();
  const { items: districts } = useDistricts();
  const { items: allUpazilas } = useAllUpazilas();
  const { items: landTypes } = useLandTypes();
  const { items: _landStatuses } = useLandStatuses();
  const { items: ownershipTypes } = useOwnershipTypes();
  const { items: units } = useUnits();
  const { items: landUseTypes } = useLandUseTypes();
  const { items: cropTypes } = useCropTypes();
  const { items: cropSeasons } = useCropSeasons();
  const { items: treeTypes } = useTreeTypes();
  const { items: ageCategories } = useTreeAgeCategories();
  const { items: infraTypes } = useInfrastructureTypes();
  const { items: usageTypes } = useUsageTypes();
  const { items: tenantTypes } = useTenantTypes();
  const { items: employmentTypes } = useEmploymentTypes();
  const { items: businessTypes } = useBusinessTypes();
  const { items: businessCategories } = useBusinessCategories();
  const { items: ownershipTypesList } = useBusinessOwnershipTypes();

  // EP-scoped options: landlord structures (Sl No) for tenants,
  // business list for wage-labour workers.
  const { data: structureData } = useInfrastructures(apId > 0 ? apId : null);
  const sortedStructures = [...(structureData?.items ?? [])].sort(
    (a, b) => Number(a.infrastructure_id) - Number(b.infrastructure_id),
  );
  const structureOptions = sortedStructures.map((s, i) => ({
    value: Number(s.infrastructure_id),
    label: `#${i + 1} · ${s.infrastructure_type ?? 'Structure'}`,
  }));

  const { data: businessesData } = useQuery({
    queryKey: ['businesses', apId],
    queryFn: () => listBusinesses(apId),
    enabled: sectionId === 'workers' && apId > 0,
  });
  const businessOptions = (businessesData?.items ?? []).map((b) => ({
    value: Number(b.business_id),
    label: b.business_name,
  }));

  const otherOccupationId = Number(occupations.find((o) => String(o.name).toLowerCase() === 'other')?.id) || 0;

  // ── Field set per section ────────────────────────────────────
  function fieldsFor(): CrudField[] {
    switch (sectionId) {
      case 'eps':
        return [
          { name: 'hh_id', label: 'HH ID', type: 'text' },
          { name: 'name', label: 'EP Name', type: 'text', required: true },
          { name: 'father_name', label: 'Father/Husband Name', type: 'text' },
          { name: 'mother_name', label: "Mother's Name", type: 'text' },
          { name: 'spouse_name', label: 'Spouse Name', type: 'text' },
          { name: 'nid_number', label: 'NID No', type: 'text' },
          { name: 'mobile', label: 'Mobile No', type: 'text' },
          { name: 'gender_id', label: 'Sex', type: 'select', options: toOptions(genders) },
          { name: 'gender_other', label: 'Sex (other)', type: 'text' },
          { name: 'date_of_birth', label: 'Date of Birth', type: 'date' },
          { name: 'age', label: 'Age', type: 'number', min: 0, max: 150 },
          { name: 'religion_id', label: 'Religion', type: 'select', options: toOptions(religions) },
          { name: 'religion_other', label: 'Religion (other)', type: 'text' },
          { name: 'occupation_id', label: 'Occupation', type: 'select', options: toOptions(occupations) },
          { name: 'occupation_other', label: 'Occupation (other)', type: 'text' },
          { name: 'district_id', label: 'District', type: 'select', options: toOptions(districts) },
          { name: 'upazila_id', label: 'Upazila', type: 'select', options: toOptions(allUpazilas) },
          { name: 'phase', label: 'Project Phase', type: 'text' },
          { name: 'mouza', label: 'Mouza', type: 'text' },
          { name: 'union_name', label: 'Union', type: 'text' },
          { name: 'category_of_loss', label: 'Category of Loss', type: 'text' },
          { name: 'ownership', label: 'Ownership', type: 'text' },
          { name: 'dc_compensation', label: 'DC Compensation (৳)', type: 'number', step: '0.01', min: 0 },
          { name: 'cheque_no', label: 'Cheque No', type: 'text' },
          { name: 'cheque_date', label: 'Cheque Date', type: 'date' },
          { name: 'yearly_income', label: 'Yearly Income (৳)', type: 'number', step: '0.01', min: 0 },
          { name: 'is_household_head', label: 'Household Head?', type: 'checkbox' },
          { name: 'total_family_member', label: 'Total Family', type: 'number', min: 0 },
          { name: 'male_member', label: 'Male Member', type: 'number', min: 0 },
          { name: 'female_member', label: 'Female Member', type: 'number', min: 0 },
          { name: 'is_disabled', label: 'Disabled?', type: 'checkbox' },
          { name: 'is_landless', label: 'Landless?', type: 'checkbox' },
          { name: 'is_tribal', label: 'Tribal?', type: 'checkbox' },
          { name: 'has_business_loss', label: 'Business Loss?', type: 'checkbox' },
          { name: 'is_tenant', label: 'Tenant?', type: 'checkbox' },
          { name: 'total_tenant', label: 'Tenant No', type: 'number', min: 0 },
          { name: 'remarks', label: 'Remarks', type: 'textarea' },
        ];
      case 'gps':
        return [
          { name: 'gps_latitude', label: 'GPS Latitude', type: 'number', step: '0.000001' },
          { name: 'gps_longitude', label: 'GPS Longitude', type: 'number', step: '0.000001' },
          { name: 'location_accuracy', label: 'Accuracy (m)', type: 'number', step: '0.01', min: 0 },
          { name: 'location_source_id', label: 'Location Source', type: 'select', options: toOptions(locationSources) },
        ];
      case 'family-members':
        return [
          { name: 'name', label: 'Member Name', type: 'text' },
          { name: 'relationship_id', label: 'Relationship', type: 'select', options: toOptions(relationships), required: true },
          { name: 'relationship_other', label: 'Relationship (other)', type: 'text' },
          { name: 'gender_id', label: 'Sex', type: 'select', options: toOptions(genders), required: true },
          { name: 'gender_other', label: 'Sex (other)', type: 'text' },
          { name: 'marital_status', label: 'Marital Status', type: 'text' },
          { name: 'age', label: 'Age (year)', type: 'number', min: 0, max: 150 },
          { name: 'education', label: 'Education', type: 'text' },
          { name: 'education_other', label: 'Education (other)', type: 'text' },
          { name: 'occupation_id', label: 'Occupation', type: 'select', options: toOptions(occupations) },
          { name: 'occupation_other', label: 'Occupation (other)', type: 'text' },
          { name: 'does_work', label: 'Does Work?', type: 'checkbox' },
          { name: 'annual_income', label: 'Annual Income (৳)', type: 'number', step: '0.01', min: 0 },
          { name: 'health_status', label: 'Health / Disability', type: 'text' },
          { name: 'disability_type', label: 'Disability Type', type: 'text' },
          { name: 'is_dependent', label: 'Dependent?', type: 'checkbox' },
          { name: 'remarks', label: 'Remarks', type: 'textarea' },
        ];
      case 'lands':
        return [
          { name: 'land_type_id', label: 'Land Type', type: 'select', options: toOptions(landTypes), required: true },
          { name: 'land_type_other', label: 'Land Type (other)', type: 'text' },
          { name: 'ownership_type_id', label: 'Ownership Type', type: 'select', options: toOptions(ownershipTypes), required: true },
          { name: 'ownership_type_other', label: 'Ownership (other)', type: 'text' },
          { name: 'district_id', label: 'District', type: 'select', options: toOptions(districts) },
          { name: 'upazila_id', label: 'Upazila', type: 'select', options: toOptions(allUpazilas) },
          { name: 'mouza', label: 'Mouza', type: 'text' },
          { name: 'khatian_number', label: 'Khatian #', type: 'text' },
          { name: 'dag_number', label: 'Dag #', type: 'text' },
          { name: 'la_case_no', label: 'LA Case No', type: 'text' },
          { name: 'dc_pay_amount', label: 'DC Pay Amount (৳)', type: 'number', step: '0.01', min: 0 },
          { name: 'dc_cheque_no', label: 'Cheque No', type: 'text' },
          { name: 'dc_pay_date', label: 'Cheque Date', type: 'date' },
          { name: 'land_area', label: 'Land Area', type: 'number', step: '0.0001', min: 0, required: true },
          { name: 'land_area_unit_id', label: 'Area Unit', type: 'select', options: toOptions(units), required: true },
          { name: 'land_use_type_id', label: 'Land Use Type', type: 'select', options: toOptions(landUseTypes), required: true },
          { name: 'land_use_type_other', label: 'Use Type (other)', type: 'text' },
          { name: 'remarks', label: 'Remarks', type: 'textarea' },
        ];
      case 'crops':
        return [
          { name: 'crop_type_id', label: 'Crop Type', type: 'select', options: toOptions(cropTypes), required: true },
          { name: 'crop_season_id', label: 'Crop Season', type: 'select', options: toOptions(cropSeasons), required: true },
          { name: 'cultivated_area', label: 'Cultivated Area', type: 'number', step: '0.0001', min: 0, required: true },
          { name: 'area_unit_id', label: 'Area Unit', type: 'select', options: toOptions(units), required: true },
          { name: 'damage_percentage', label: 'Damage %', type: 'number', step: '0.01', min: 0, max: 100, required: true },
          { name: 'remarks', label: 'Remarks', type: 'textarea' },
        ];
      case 'infrastructures':
        return [
          { name: 'infrastructure_type_id', label: 'Structure Type', type: 'select', options: toOptions(infraTypes), required: true },
          { name: 'usage_type_id', label: 'Usage Type', type: 'select', options: toOptions(usageTypes), required: true },
          { name: 'structure_nature', label: 'Nature', type: 'select', options: [{ value: 'Primary', label: 'Primary' }, { value: 'Secondary', label: 'Secondary' }], required: true },
          { name: 'structure_material', label: 'Material', type: 'select', options: [{ value: 'Pacca', label: 'Pacca' }, { value: 'Semi Pacca', label: 'Semi Pacca' }, { value: 'Tin Made', label: 'Tin Made' }, { value: 'Katcha', label: 'Katcha' }, { value: 'Thatched', label: 'Thatched' }, { value: 'Other', label: 'Other' }], required: true },
          { name: 'structure_material_other', label: 'Specify Other Material', type: 'text' },
          { name: 'length', label: 'Length (ft)', type: 'number', step: '0.01', min: 0 },
          { name: 'width', label: 'Width (ft)', type: 'number', step: '0.01', min: 0 },
          { name: 'area_sqft', label: 'Area (sq ft)', type: 'number', step: '0.01', min: 0, required: true },
          { name: 'damage_percentage', label: 'Damage %', type: 'number', step: '0.01', min: 0, max: 100, required: true },
          { name: 'remarks', label: 'Remarks', type: 'textarea' },
        ];
      case 'trees':
        return [
          { name: 'name', label: 'Name of Tree', type: 'text' },
          { name: 'land_ownership', label: 'Land Ownership', type: 'text' },
          { name: 'tree_type_id', label: 'Tree Type', type: 'select', options: toOptions(treeTypes), required: true },
          { name: 'tree_type_other', label: 'Tree Type (other)', type: 'text' },
          { name: 'tree_age_category_id', label: 'Size / Age Category', type: 'select', options: toOptions(ageCategories), required: true },
          { name: 'quantity', label: 'Quantity', type: 'number', min: 1, required: true },
          { name: 'remarks', label: 'Remarks', type: 'textarea' },
        ];
      case 'tenants':
        return [
          { name: 'tenant_type_id', label: 'Type of Tenant', type: 'select', options: toOptions(tenantTypes), required: true },
          { name: 'name', label: 'Tenant Name', type: 'text', required: true },
          { name: 'father_name', label: 'Father Name', type: 'text' },
          { name: 'nid_number', label: 'NID No', type: 'text' },
          { name: 'mobile', label: 'Mobile No', type: 'text' },
          { name: 'mouza', label: 'Mouza', type: 'text' },
          { name: 'union_name', label: 'Union', type: 'text' },
          { name: 'district_id', label: 'District', type: 'select', options: toOptions(districts) },
          { name: 'upazila_id', label: 'Upazila', type: 'select', options: toOptions(allUpazilas) },
          { name: 'age', label: 'Age', type: 'number', min: 0, max: 150 },
          { name: 'gender_id', label: 'Sex', type: 'select', options: toOptions(genders) },
          { name: 'occupation_id', label: 'Occupation', type: 'select', options: toOptions(occupations) },
          { name: 'occupation_other', label: 'Specify Occupation', type: 'text', placeholder: 'Type the occupation', visible: (form) => Number(form.occupation_id) === otherOccupationId },
          { name: 'annual_income', label: 'Annual Income (৳)', type: 'number', step: '0.01', min: 0 },
          { name: 'address', label: 'Address', type: 'textarea' },
          { name: 'agreement_number', label: 'Agreement #', type: 'text' },
          { name: 'monthly_rent', label: 'Monthly Rent (৳)', type: 'number', step: '0.01', min: 0 },
          {
            name: 'infrastructure_ids',
            label: 'Rented Structure(s) — Sl No',
            type: 'multiselect',
            options: structureOptions,
            help: 'Select every structure this tenant rents.',
          },
          { name: 'remarks', label: 'Remarks', type: 'textarea' },
        ];
      case 'businesses':
        return [
          { name: 'business_ownership_type_id', label: 'Ownership Type', type: 'select', options: toOptions(ownershipTypesList), required: true },
          { name: 'business_type_id', label: 'Business Type', type: 'select', options: toOptions(businessTypes), required: true },
          { name: 'business_type_other', label: 'Business Type (other)', type: 'text' },
          { name: 'business_category_id', label: 'Business Category', type: 'select', options: toOptions(businessCategories), required: true },
          { name: 'business_name', label: 'Business Name', type: 'text', required: true },
          { name: 'capital_amount', label: 'Capital (৳)', type: 'number', step: '0.01', min: 0, required: true },
          { name: 'present_address', label: 'Present Address', type: 'textarea' },
          { name: 'annual_income', label: 'Annual Income (৳)', type: 'number', step: '0.01', min: 0 },
          { name: 'has_wage_labour', label: 'Has Wage Labour?', type: 'checkbox' },
          { name: 'number_of_wage_labour', label: 'No. of Wage Labour', type: 'number', min: 0 },
          { name: 'has_income_tax', label: 'Has Income Tax?', type: 'checkbox' },
          { name: 'income_tax_id', label: 'Income Tax ID', type: 'text' },
          { name: 'latitude', label: 'Latitude', type: 'number', step: '0.000001' },
          { name: 'longitude', label: 'Longitude', type: 'number', step: '0.000001' },
          { name: 'remarks', label: 'Remarks', type: 'textarea' },
        ];
      case 'workers':
        return [
          { name: 'name', label: 'Worker Name', type: 'text', required: true },
          { name: 'business_id', label: 'Business Owner', type: 'select', options: businessOptions },
          { name: 'father_name', label: "Father's Name", type: 'text' },
          { name: 'mobile', label: 'Mobile No', type: 'text' },
          { name: 'nid_number', label: 'NID No', type: 'text' },
          { name: 'mouza', label: 'Mouza', type: 'text' },
          { name: 'union_name', label: 'Union', type: 'text' },
          { name: 'district_id', label: 'District', type: 'select', options: toOptions(districts) },
          { name: 'upazila_id', label: 'Upazila', type: 'select', options: toOptions(allUpazilas) },
          { name: 'total_family_member', label: 'Total Family', type: 'number', min: 0, max: 200 },
          { name: 'duration_of_employment_month', label: 'Employment (Month)', type: 'number', min: 0, max: 1200 },
          { name: 'gender_id', label: 'Sex', type: 'select', options: toOptions(genders), required: true },
          { name: 'gender_other', label: 'Sex (other)', type: 'text' },
          { name: 'age', label: 'Age', type: 'number', min: 0 },
          { name: 'occupation_id', label: 'Occupation', type: 'select', options: toOptions(occupations) },
          { name: 'occupation_other', label: 'Occupation (other)', type: 'text' },
          { name: 'employment_type_id', label: 'Employment Type', type: 'select', options: toOptions(employmentTypes) },
          { name: 'employment_type_other', label: 'Employment Type (other)', type: 'text' },
          { name: 'monthly_income', label: 'Monthly Income (৳)', type: 'number', step: '0.01', min: 0, required: true },
          { name: 'remarks', label: 'Remarks', type: 'textarea' },
        ];
      default:
        return [];
    }
  }

  const fields = fieldsFor();

  // ── Load record, prefill form ───────────────────────────────
  const idMap = idOf(row, editor.idKeys);
  const { data: record, isLoading: loadingRecord, error: loadError } = useQuery({
    queryKey: ['baseline-edit', sectionId, apId, ...editor.idKeys.map((k) => row[k])],
    queryFn: () => editor.get(apId, idMap),
    retry: false,
    enabled: apId > 0,
  });

  const [form, setForm] = useState<Record<string, FormValue>>({});

  useEffect(() => {
    if (!record) return;
    const rec = record as Record<string, unknown>;
    const initial: Record<string, FormValue> = {};
    for (const f of fields) {
      const raw = rec[f.name];
      if (f.type === 'checkbox') {
        initial[f.name] = Boolean(raw);
      } else if (f.type === 'multiselect') {
        initial[f.name] = Array.isArray(raw) ? raw.map((v) => Number(v)) : [];
      } else if (f.type === 'number') {
        initial[f.name] = raw === null || raw === undefined ? '' : Number(raw);
      } else {
        initial[f.name] = raw === null || raw === undefined ? '' : String(raw);
      }
    }
    setForm(initial);
  }, [record]);

  function setField(name: string, value: FormValue) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // ── Save ────────────────────────────────────────────────────
  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {};
      for (const f of fields) {
        const value = form[f.name];
        if (f.type === 'checkbox') {
          payload[f.name] = Boolean(value);
        } else if (f.type === 'multiselect') {
          payload[f.name] = Array.isArray(value) ? value.map((v) => Number(v)) : [];
        } else if (f.type === 'number') {
          payload[f.name] = value === '' || value === null ? null : Number(value);
        } else {
          payload[f.name] = value === '' ? null : String(value);
        }
      }
      return editor.update(apId, idMap, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['baseline', sectionId] });
      qc.invalidateQueries({ queryKey: ['ep-file-data', apId] });
      qc.invalidateQueries({ queryKey: ['ep', apId] });
      qc.invalidateQueries({ queryKey: ['ep-validation', apId] });
      if (sectionId === 'tenants') qc.invalidateQueries({ queryKey: ['infrastructures', apId] });
      if (sectionId === 'workers') qc.invalidateQueries({ queryKey: ['businesses', apId] });
      onClose();
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  const visibleFields = fields.filter((f) => !f.visible || f.visible(form));
  const saveError = save.error as { message?: string } | Error | null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="mt-6 w-full max-w-3xl rounded-xl bg-white shadow-2xl">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-t-xl border-b border-gray-200 bg-gray-50 px-5 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              {emoji ? `${emoji} ` : ''}Edit {sectionTitle}
              <span className="ml-2 text-xs font-normal text-gray-500">
                EP {apId} · Record {editor.recordIdText(apId, idMap)}
              </span>
            </h3>
            <p className="text-xs text-gray-500">Only this record’s data is shown — changes are saved to this row only.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────── */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {loadingRecord && <LoadingSpinner message="Loading record…" />}
          {!loadingRecord && loadError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {(loadError as Error).message}
            </p>
          )}
          {!loadingRecord && saveError && (
            <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {saveError.message ?? 'Save failed.'}
            </p>
          )}
          {!loadingRecord && !loadError && !!record && (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {visibleFields.map((f) => (
                  <div key={f.name} className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">
                      {f.label}
                      {f.required && <span className="ml-0.5 text-red-500">*</span>}
                    </label>
                    {f.type === 'select' ? (
                      <select
                        value={String(form[f.name] ?? '')}
                        onChange={(e) => setField(f.name, e.target.value === '' ? '' : Number(e.target.value))}
                        className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Select...</option>
                        {f.options?.map((o) => (
                          <option key={String(o.value)} value={String(o.value)}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : f.type === 'checkbox' ? (
                      <label className="flex items-center gap-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={Boolean(form[f.name])}
                          onChange={(e) => setField(f.name, e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">Yes</span>
                      </label>
                    ) : f.type === 'multiselect' ? (
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded border border-gray-300 bg-white px-3 py-2">
                        {(f.options?.length ?? 0) === 0 && (
                          <span className="text-xs text-gray-400">No options available</span>
                        )}
                        {f.options?.map((o) => {
                          const selected = Array.isArray(form[f.name]) ? (form[f.name] as (string | number)[]) : [];
                          const checked = selected.map(String).includes(String(o.value));
                          return (
                            <label key={String(o.value)} className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const next = checked
                                    ? selected.filter((v) => String(v) !== String(o.value))
                                    : [...selected, o.value];
                                  setField(f.name, next);
                                }}
                                className="rounded"
                              />
                              {o.label}
                            </label>
                          );
                        })}
                      </div>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        value={String(form[f.name] ?? '')}
                        onChange={(e) => setField(f.name, e.target.value)}
                        rows={2}
                        className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      <input
                        type={f.type}
                        value={String(form[f.name] ?? '')}
                        onChange={(e) => setField(f.name, e.target.value)}
                        step={f.step}
                        min={f.min}
                        max={f.max}
                        placeholder={f.placeholder}
                        className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    )}
                    {f.help && <p className="text-[11px] text-gray-400">{f.help}</p>}
                  </div>
                ))}
              </div>

              {/* ── Footer ──────────────────────────────── */}
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={save.isPending}
                  className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {save.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}