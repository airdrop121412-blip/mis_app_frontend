// Additional-payment wizard for a paid EP. Original nested records remain
// read-only; second-payment rows are editable until voucher approval.

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '../../components/PageLayout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { useEp, useFamilyMembers, useLands, useInfrastructures, useTrees, useTenants, useBusinesses, useWorkers } from '../../hooks/useEp';
import {
  createCrop, createFamilyMember, createLand, createInfrastructure, createTree,
  createTenant, createBusiness, createWorker, listCrops,
  updateFamilyMember, deleteFamilyMember, updateLand, deleteLand,
  updateCrop, deleteCrop, updateInfrastructure, deleteInfrastructure,
  updateTree, deleteTree, updateTenant, deleteTenant,
  updateBusiness, deleteBusiness, updateWorker, deleteWorker,
} from '../../api/ep';
import { useCompensations } from '../../hooks/useEc';
import { createAdditionalCompensation, updateCompensation, deleteCompensation } from '../../api/ec';
import { useQueryClient } from '@tanstack/react-query';
import {
  useRelationships, useLandTypes, useOwnershipTypes, useLandStatuses, useLandUseTypes,
  useUnits, useCropTypes, useCropSeasons, useInfrastructureTypes, useUsageTypes,
  useTreeTypes, useTreeAgeCategories, useTenantTypes, useBusinessTypes,
  useBusinessCategories, useBusinessOwnershipTypes, useEmploymentTypes,
  useGenders, useOccupations, useDistricts,
  masterLabel, masterValue,
} from '../../hooks/useMasters';
import type { MasterItem } from '../../types/ep';
import { COMPENSATION_CATEGORY_ORDER, COMPENSATION_LABELS } from '../../types/ec';
import type { Compensation } from '../../types/ec';

type FormValue = string | number | boolean | (string | number)[];
type Row = Record<string, unknown>;
type Field = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'checkbox' | 'select' | 'multiselect';
  required?: boolean;
  min?: number;
  step?: string;
  options?: Array<{ value: string | number; label: string }>;
  visible?: (form: Row) => boolean;
};

function masterOptions(items: MasterItem[]) {
  return items.map((item) => ({ value: masterValue(item), label: masterLabel(item) }));
}

function otherId(items: MasterItem[]): number {
  const item = items.find((entry) => masterLabel(entry).trim().toLowerCase() === 'other');
  return item ? masterValue(item) : 0;
}

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function display(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

function FormFields({
  fields,
  form,
  setField,
}: {
  fields: Field[];
  form: Row;
  setField: (name: string, value: FormValue) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.filter((field) => !field.visible || field.visible(form)).map((field) => (
        <label key={field.name} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
          <span className="mb-1 block text-xs font-medium text-gray-600">
            {field.label}{field.required && <span className="text-red-500"> *</span>}
          </span>
          {field.type === 'select' ? (
            <select
              value={text(form[field.name])}
              onChange={(event) => {
                const option = (field.options ?? []).find((item) => String(item.value) === event.target.value);
                setField(field.name, option?.value ?? '');
              }}
              className="form-select w-full"
            >
              <option value="">Select...</option>
              {(field.options ?? []).map((option) => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}
            </select>
          ) : field.type === 'multiselect' ? (
            <select multiple value={Array.isArray(form[field.name]) ? (form[field.name] as Array<string | number>).map(String) : []} onChange={(event) => setField(field.name, Array.from(event.target.selectedOptions).map((option) => Number(option.value)))} className="form-select w-full">
              {(field.options ?? []).map((option) => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}
            </select>
          ) : field.type === 'checkbox' ? (
            <input type="checkbox" checked={Boolean(form[field.name])} onChange={(event) => setField(field.name, event.target.checked)} className="mt-2 rounded" />
          ) : field.type === 'textarea' ? (
            <textarea rows={2} value={text(form[field.name])} onChange={(event) => setField(field.name, event.target.value)} className="form-input w-full" />
          ) : (
            <input type={field.type ?? 'text'} min={field.min} step={field.step} value={text(form[field.name])} onChange={(event) => setField(field.name, event.target.value)} className="form-input w-full" />
          )}
        </label>
      ))}
    </div>
  );
}

function AddOnlySection({
  title, existing, fields, idKey, columns, create, onCreated, update, remove, emptyMessage = 'No records saved yet.',
}: {
  title: string;
  existing: unknown[];
  fields: Field[];
  idKey: string;
  columns: Array<{ header: string; render: (row: Row) => string }>;
  create: (payload: Row) => Promise<unknown>;
  onCreated: (row: Row) => void;
  update?: (id: number, payload: Row) => Promise<unknown>;
  remove?: (id: number) => Promise<void>;
  emptyMessage?: string;
}) {
  const [form, setForm] = useState<Row>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Row>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, Row>>({});
  const [removedIds, setRemovedIds] = useState<number[]>([]);

  function setField(name: string, value: FormValue) {
    setForm((previous) => ({ ...previous, [name]: value }));
    setError(null);
  }

  async function save() {
    const missing = fields.find((field) => {
      if (!field.required || (field.visible && !field.visible(form))) return false;
      const value = form[field.name];
      return value === undefined || value === null || value === '' || value === 0
        || (Array.isArray(value) && value.length === 0);
    });
    if (missing) {
      setError(`${missing.label} is required.`);
      return;
    }
    setSaving(true);
    try {
      const created = await create(form);
      onCreated(created as Row);
      setForm({});
    } catch (cause) {
      const apiError = cause as { message?: string };
      setError(apiError.message ?? 'The record could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(row: Row) {
    setEditingId(Number(row[idKey]));
    setEditForm({ ...row });
    setEditError(null);
  }

  async function saveEdit() {
    if (!update || editingId === null) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await update(editingId, editForm);
      setOverrides((previous) => ({
        ...previous,
        [String(editingId)]: {
          ...editForm,
          ...(updated as Row),
          payment_cycle: 2,
          payment_cycle_label: 'Paid in 2nd Payment',
          is_locked: false,
        },
      }));
      setEditingId(null);
      setEditForm({});
    } catch (cause) {
      setEditError((cause as { message?: string }).message ?? 'The record could not be updated.');
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteRow(row: Row) {
    if (!remove || !window.confirm(`Delete this ${title.toLowerCase()}?`)) return;
    try {
      await remove(Number(row[idKey]));
      setRemovedIds((previous) => [...previous, Number(row[idKey])]);
    } catch (cause) {
      setError((cause as { message?: string }).message ?? 'The record could not be deleted.');
    }
  }

  const rows = (existing as Row[])
    .filter((row) => !removedIds.includes(Number(row[idKey])))
    .map((row) => overrides[String(row[idKey])] ?? row);
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mb-4 text-xs text-gray-500">Original records are locked. New second-payment records remain editable until their voucher is approved.</p>
      {rows.length === 0 ? (
        <p className="mb-4 rounded border border-dashed border-gray-300 py-6 text-center text-sm text-gray-400">{emptyMessage}</p>
      ) : (
        <div className="mb-5 overflow-x-auto rounded border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">#</th>
                {columns.map((column) => <th key={column.header} className="px-3 py-2">{column.header}</th>)}
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, index) => (
                <tr key={text(row[idKey]) || index}>
                  <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                  {columns.map((column) => <td key={column.header} className="px-3 py-2">{column.render(row)}</td>)}
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {display(row.payment_cycle_label ?? (row.is_locked === false ? 'Paid in 2nd Payment' : 'Paid in 1st Payment'))}
                    {row.is_locked === false && <span className="ml-2 text-emerald-700">Editable</span>}
                    {row.is_locked !== false && <span className="ml-2">🔒 Locked</span>}
                    {row.is_locked === false && update && <button type="button" onClick={() => beginEdit(row)} className="ml-2 rounded border border-blue-300 px-2 py-1 text-blue-700">Edit</button>}
                    {row.is_locked === false && remove && <button type="button" onClick={() => void deleteRow(row)} className="ml-1 rounded border border-red-300 px-2 py-1 text-red-700">Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700">New {title}</h3>
        {error && <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <FormFields fields={fields} form={form} setField={setField} />
        <button type="button" onClick={() => void save()} disabled={saving} className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save new record'}
        </button>
      </div>
      {editingId !== null && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-700">Edit unlocked {title}</h3>
          {editError && <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</p>}
          <FormFields fields={fields} form={editForm} setField={(name, value) => setEditForm((previous) => ({ ...previous, [name]: value }))} />
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => void saveEdit()} disabled={editSaving} className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{editSaving ? 'Saving...' : 'Save changes'}</button>
            <button type="button" onClick={() => setEditingId(null)} className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700">Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}

const column = (header: string, key: string) => ({ header, render: (row: Row) => display(row[key]) });
const numeric = (value: unknown) => value === '' || value === undefined ? '' : String(value);

export function AdditionalPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const epId = Number(id);
  const queryClient = useQueryClient();
  const { data: ep, isLoading: epLoading, error: epError } = useEp(epId);
  const family = useFamilyMembers(epId);
  const lands = useLands(epId);
  const structures = useInfrastructures(epId);
  const trees = useTrees(epId);
  const tenants = useTenants(epId);
  const businesses = useBusinesses(epId);
  const workers = useWorkers(epId);
  const compensations = useCompensations(epId);
  const [added, setAdded] = useState<Record<string, Row[]>>({});
  const [step, setStep] = useState(2);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [compError, setCompError] = useState<string | null>(null);
  const [compSaving, setCompSaving] = useState(false);
  const [editingCompensationId, setEditingCompensationId] = useState<number | null>(null);
  const [editingCompAmount, setEditingCompAmount] = useState('');
  const [editingCompRemarks, setEditingCompRemarks] = useState('');
  const [editingCompError, setEditingCompError] = useState<string | null>(null);

  const relationships = useRelationships();
  const landTypes = useLandTypes();
  const ownershipTypes = useOwnershipTypes();
  const { items: _landStatuses } = useLandStatuses();
  const landUseTypes = useLandUseTypes();
  const units = useUnits();
  const cropTypes = useCropTypes();
  const cropSeasons = useCropSeasons();
  const infrastructureTypes = useInfrastructureTypes();
  const usageTypes = useUsageTypes();
  const treeTypes = useTreeTypes();
  const treeAgeCategories = useTreeAgeCategories();
  const tenantTypes = useTenantTypes();
  const businessTypes = useBusinessTypes();
  const businessCategories = useBusinessCategories();
  const businessOwnershipTypes = useBusinessOwnershipTypes();
  const employmentTypes = useEmploymentTypes();
  const genders = useGenders();
  const occupations = useOccupations();
  const districts = useDistricts();
  const otherRelationshipId = otherId(relationships.items);
  const otherGenderId = otherId(genders.items);
  const otherOccupationId = otherId(occupations.items);
  const otherLandTypeId = otherId(landTypes.items);
  const otherOwnershipTypeId = otherId(ownershipTypes.items);
  const otherLandUseTypeId = otherId(landUseTypes.items);
  const otherCropTypeId = otherId(cropTypes.items);
  const otherInfrastructureTypeId = otherId(infrastructureTypes.items);
  const otherUsageTypeId = otherId(usageTypes.items);
  const otherTreeTypeId = otherId(treeTypes.items);
  const otherTenantTypeId = otherId(tenantTypes.items);
  const otherBusinessTypeId = otherId(businessTypes.items);
  const otherBusinessCategoryId = otherId(businessCategories.items);
  const otherBusinessOwnershipId = otherId(businessOwnershipTypes.items);
  const otherEmploymentTypeId = otherId(employmentTypes.items);
  const otherRelationshipField = (form: Row) => Number(form.relationship_id) === otherRelationshipId;
  const otherGenderField = (form: Row) => Number(form.gender_id) === otherGenderId;
  const otherOccupationField = (form: Row) => Number(form.occupation_id) === otherOccupationId;

  const landRows = useMemo(() => [...(lands.data?.items ?? []), ...(added.land ?? [])], [lands.data, added.land]);
  const cropQuery = useQuery({
    queryKey: ['additional-payment-crops', epId, landRows.map((land) => land.land_id).join(',')],
    queryFn: async () => {
      const results = await Promise.all(landRows.filter((land) => Number(land.land_id) > 0).map((land) => listCrops(epId, Number(land.land_id))));
      return results.flatMap((result) => result.items);
    },
    enabled: landRows.length > 0,
  });
  const cropRows = useMemo(() => [...(cropQuery.data ?? []), ...(added.crop ?? [])], [cropQuery.data, added.crop]);
  const allStructures = useMemo(() => [...(structures.data?.items ?? []), ...(added.infrastructure ?? [])], [structures.data, added.infrastructure]);
  const allTenants = useMemo(() => [...(tenants.data?.items ?? []), ...(added.tenant ?? [])], [tenants.data, added.tenant]);
  const allBusinesses = useMemo(() => [...(businesses.data?.items ?? []), ...(added.business ?? [])], [businesses.data, added.business]);
  const addLocal = (key: string) => (row: Row) => {
    setAdded((previous) => ({
      ...previous,
      [key]: [...(previous[key] ?? []), {
        ...row,
        payment_cycle: row.payment_cycle ?? 2,
        payment_cycle_label: row.payment_cycle_label ?? 'Paid in 2nd Payment',
        is_locked: row.is_locked ?? false,
      }],
    }));
    const queryKeys: Record<string, string> = {
      family: 'family-members',
      land: 'lands',
      crop: 'additional-payment-crops',
      infrastructure: 'infrastructures',
      tree: 'trees',
      tenant: 'tenants',
      business: 'businesses',
      worker: 'workers',
    };
    void queryClient.invalidateQueries({ queryKey: [queryKeys[key], epId] });
  };
  const options = (items: MasterItem[]) => masterOptions(items);
  const existingCompensations = compensations.data ?? [];
  // A category is unavailable only when it was already added in THIS
  // additional-payment cycle (payment_cycle 2). Categories paid in the
  // original payment (cycle 1) can receive a new second-payment row.
  const availableCategories = COMPENSATION_CATEGORY_ORDER
    .filter((item) => !existingCompensations.some(
      (compensation) => compensation.category === item && compensation.payment_cycle === 2
    ));

  if (epLoading) return <LoadingSpinner message="Loading paid EP..." />;
  if (epError) return <ErrorDisplay message={epError instanceof Error ? epError.message : 'Failed to load EP'} />;
  if (!ep) return <ErrorDisplay message="EP not found." />;
  if (ep.status !== 'PAID') return <ErrorDisplay message="Additional payment is available only for PAID EPs." />;

  async function addCompensation() {
    if (!category || !amount || Number(amount) <= 0) {
      setCompError('Select a new loss category and enter a positive amount.');
      return;
    }

    setCompSaving(true);
    setCompError(null);
    try {
      await createAdditionalCompensation(epId, { category, approved_amount: amount, remarks: 'Additional loss entered after previous payment.' });
      await queryClient.invalidateQueries({ queryKey: ['compensations', epId] });
      await queryClient.invalidateQueries({ queryKey: ['ec', epId] });
      setCategory('');
      setAmount('');
    } catch (cause) {
      setCompError((cause as { message?: string }).message ?? 'Additional compensation could not be created.');
    } finally {
      setCompSaving(false);
    }
  }

  async function saveCompensationEdit() {
    if (editingCompensationId === null || !editingCompAmount || Number(editingCompAmount) <= 0) {
      setEditingCompError('Enter a positive amount.');
      return;
    }
    setEditingCompError(null);
    try {
      await updateCompensation(epId, editingCompensationId, {
        approved_amount: editingCompAmount,
        remarks: editingCompRemarks,
      });
      await queryClient.invalidateQueries({ queryKey: ['compensations', epId] });
      setEditingCompensationId(null);
    } catch (cause) {
      setEditingCompError((cause as { message?: string }).message ?? 'Additional compensation could not be updated.');
    }
  }

  const sectionProps = {
    family: {
      existing: [...(family.data?.items ?? []), ...(added.family ?? [])],
      fields: [
        { name: 'name', label: 'Name' }, { name: 'relationship_id', label: 'Relationship', type: 'select' as const, required: true, options: options(relationships.items) }, { name: 'relationship_other', label: 'Specify other relationship', visible: otherRelationshipField },
        { name: 'gender_id', label: 'Gender', type: 'select' as const, required: true, options: options(genders.items) }, { name: 'gender_other', label: 'Specify other gender', visible: otherGenderField },
        { name: 'age', label: 'Age', type: 'number' as const, min: 0 }, { name: 'marital_status', label: 'Marital status' },
        { name: 'education', label: 'Education' }, { name: 'education_other', label: 'Other education' },         { name: 'occupation_id', label: 'Occupation', type: 'select' as const, options: options(occupations.items) }, { name: 'occupation_other', label: 'Specify other occupation', visible: otherOccupationField }, { name: 'annual_income', label: 'Annual income', type: 'number' as const, min: 0, step: '0.01' },
        { name: 'does_work', label: 'Does work', type: 'checkbox' as const }, { name: 'is_dependent', label: 'Dependent', type: 'checkbox' as const },
        { name: 'remarks', label: 'Remarks', type: 'textarea' as const },
      ],
      create: (payload: Row) => createFamilyMember(epId, payload),
    },
  };

  return (
    <PageLayout
      title={`Additional payment — ${ep.ep_id ?? ep.name}`}
      subtitle="Additional payment wizard. Original records stay locked; second-payment records lock when the voucher is approved."
      actions={<Link to={`/ep/${epId}/voucher`} className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">← Back to vouchers</Link>}
    >
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Original family, land, crop, structure, tree, tenant, business and wage-labour records cannot be edited or deleted. New second-payment records can be edited or deleted until approval of the additional voucher.
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {[2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
          <button key={value} type="button" onClick={() => setStep(value)} className={`rounded px-3 py-2 text-sm ${step === value ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700'}`}>
            Step {value}
          </button>
        ))}
      </div>

      {step === 2 && <AddOnlySection title="Family member" existing={sectionProps.family.existing} fields={sectionProps.family.fields} idKey="family_member_id" columns={[column('Name', 'name'), column('Relationship', 'relationship'), column('Gender', 'gender'), column('Age', 'age')]} create={sectionProps.family.create} onCreated={addLocal('family')} update={(id, payload) => updateFamilyMember(epId, id, payload as never)} remove={(id) => deleteFamilyMember(epId, id)} />}
      {step === 3 && <AddOnlySection title="Land parcel" existing={[...(lands.data?.items ?? []), ...(added.land ?? [])]} fields={[
        { name: 'land_type_id', label: 'Land type', type: 'select', required: true, options: options(landTypes.items) }, { name: 'land_type_other', label: 'Specify other land type', visible: (form) => Number(form.land_type_id) === otherLandTypeId },
        { name: 'ownership_type_id', label: 'Ownership type', type: 'select', required: true, options: options(ownershipTypes.items) }, { name: 'ownership_type_other', label: 'Specify other ownership', visible: (form) => Number(form.ownership_type_id) === otherOwnershipTypeId }, { name: 'district_id', label: 'District', type: 'select', options: options(districts.items) }, { name: 'upazila_id', label: 'Upazila', type: 'number' },
        { name: 'village_id', label: 'Village', type: 'number' }, { name: 'mouza', label: 'Mouza' }, { name: 'land_area', label: 'Land area', type: 'number', required: true, min: 0, step: '0.0001' }, { name: 'land_area_unit_id', label: 'Area unit', type: 'select', required: true, options: options(units.items) },
        { name: 'land_use_type_id', label: 'Land use', type: 'select', required: true, options: options(landUseTypes.items) }, { name: 'land_use_type_other', label: 'Specify other land use', visible: (form) => Number(form.land_use_type_id) === otherLandUseTypeId }, { name: 'khatian_number', label: 'Khatian number' }, { name: 'dag_number', label: 'Dag number' }, { name: 'la_case_no', label: 'LA case number' }, { name: 'dc_pay_amount', label: 'DC amount', type: 'number', min: 0, step: '0.01' }, { name: 'dc_cheque_no', label: 'DC cheque number' }, { name: 'dc_pay_date', label: 'DC payment date', type: 'date' }, { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]} idKey="land_id" columns={[column('Type', 'land_type'), column('Area', 'land_area'), column('Use', 'land_use_type')]} create={(payload) => createLand(epId, { ...payload, land_area: numeric(payload.land_area), village_id: payload.village_id ? Number(payload.village_id) : null, dc_pay_amount: numeric(payload.dc_pay_amount), dc_pay_date: payload.dc_pay_date ? String(payload.dc_pay_date) : null })} onCreated={addLocal('land')} update={(id, payload) => updateLand(epId, id, { ...payload, land_area: numeric(payload.land_area), village_id: payload.village_id ? Number(payload.village_id) : null, dc_pay_amount: numeric(payload.dc_pay_amount), dc_pay_date: payload.dc_pay_date ? String(payload.dc_pay_date) : null } as never)} remove={(id) => deleteLand(epId, id)} />}
      {step === 4 && <AddOnlySection title="Crop" existing={cropRows} fields={[
        { name: 'land_id', label: 'Land parcel', type: 'select', required: true, options: landRows.map((land, index) => ({ value: Number(land.land_id), label: `Parcel ${index + 1} — ${display(land.land_type)}` })) }, { name: 'crop_type_id', label: 'Crop type', type: 'select', required: true, options: options(cropTypes.items) }, { name: 'crop_type_other', label: 'Specify other crop type', visible: (form) => Number(form.crop_type_id) === otherCropTypeId }, { name: 'crop_season_id', label: 'Season', type: 'select', required: true, options: options(cropSeasons.items) },
        { name: 'cultivated_area', label: 'Cultivated area', type: 'number', required: true, min: 0, step: '0.0001' }, { name: 'area_unit_id', label: 'Area unit', type: 'select', required: true, options: options(units.items) }, { name: 'damage_percentage', label: 'Damage %', type: 'number', min: 0, step: '0.01' }, { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]} idKey="crop_id" columns={[column('Type', 'crop_type'), column('Season', 'crop_season'), column('Area', 'cultivated_area'), column('Damage %', 'damage_percentage')]} create={async (payload) => { const landId = Number(payload.land_id); const { land_id, ...data } = payload; return createCrop(epId, landId, { ...data, cultivated_area: numeric(data.cultivated_area), damage_percentage: numeric(data.damage_percentage) }); }} onCreated={addLocal('crop')} update={async (id, payload) => { const landId = Number(payload.land_id); const { land_id, ...data } = payload; return updateCrop(epId, landId, id, { ...data, cultivated_area: numeric(data.cultivated_area), damage_percentage: numeric(data.damage_percentage) } as never); }} remove={(id) => { const landId = Number((cropRows.find((row) => Number(row.crop_id) === id) as Row | undefined)?.land_id); return deleteCrop(epId, landId, id); }} />}
      {step === 5 && <AddOnlySection title="Structure" existing={[...(structures.data?.items ?? []), ...(added.infrastructure ?? [])]} fields={[
        { name: 'infrastructure_type_id', label: 'Structure type', type: 'select', required: true, options: options(infrastructureTypes.items) }, { name: 'infrastructure_type_other', label: 'Specify other structure type', visible: (form) => Number(form.infrastructure_type_id) === otherInfrastructureTypeId }, { name: 'usage_type_id', label: 'Usage type', type: 'select', required: true, options: options(usageTypes.items) }, { name: 'usage_type_other', label: 'Specify other usage', visible: (form) => Number(form.usage_type_id) === otherUsageTypeId }, { name: 'structure_nature', label: 'Nature', type: 'select', required: true, options: ['Primary', 'Secondary'].map((value) => ({ value, label: value })) }, { name: 'structure_material', label: 'Material', type: 'select', required: true, options: ['Pacca', 'Semi Pacca', 'Tin Made', 'Katcha', 'Thatched', 'Other'].map((value) => ({ value, label: value })) }, { name: 'structure_material_other', label: 'Specify other material', visible: (form) => form.structure_material === 'Other' },
        { name: 'unit', label: 'Unit', type: 'select', options: ['SFT', 'CFT', 'RFT', 'Number'].map((value) => ({ value, label: value })) }, { name: 'length', label: 'Length', type: 'number', min: 0 }, { name: 'width', label: 'Width', type: 'number', min: 0 }, { name: 'area_sqft', label: 'Area (sq ft)', type: 'number', required: true, min: 0, step: '0.01' }, { name: 'damage_percentage', label: 'Damage %', type: 'number', required: true, min: 0, step: '0.01' }, { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]} idKey="infrastructure_id" columns={[column('Type', 'infrastructure_type'), column('Usage', 'usage_type'), column('Area', 'area_sqft'), column('Damage %', 'damage_percentage')]} create={(payload) => createInfrastructure(epId, { ...payload, length: numeric(payload.length), width: numeric(payload.width), area_sqft: numeric(payload.area_sqft), damage_percentage: numeric(payload.damage_percentage), structure_nature: payload.structure_nature as 'Primary' | 'Secondary', structure_material: payload.structure_material as 'Pacca' })} onCreated={addLocal('infrastructure')} update={(id, payload) => updateInfrastructure(epId, id, { ...payload, length: numeric(payload.length), width: numeric(payload.width), area_sqft: numeric(payload.area_sqft), damage_percentage: numeric(payload.damage_percentage) } as never)} remove={(id) => deleteInfrastructure(epId, id)} />}
      {step === 6 && <AddOnlySection title="Tree" existing={[...(trees.data?.items ?? []), ...(added.tree ?? [])]} fields={[
        { name: 'name', label: 'Name' }, { name: 'land_ownership', label: 'Land ownership' }, { name: 'tree_type_id', label: 'Tree type', type: 'select', required: true, options: options(treeTypes.items) }, { name: 'tree_type_other', label: 'Specify other tree type', visible: (form) => Number(form.tree_type_id) === otherTreeTypeId }, { name: 'tree_age_category_id', label: 'Age category', type: 'select', required: true, options: options(treeAgeCategories.items) }, { name: 'quantity', label: 'Quantity', type: 'number', required: true, min: 1 }, { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]} idKey="tree_id" columns={[column('Name', 'name'), column('Type', 'tree_type'), column('Age', 'tree_age_category'), column('Quantity', 'quantity')]} create={(payload) => createTree(epId, payload)} onCreated={addLocal('tree')} update={(id, payload) => updateTree(epId, id, payload as never)} remove={(id) => deleteTree(epId, id)} />}
      {step === 7 && <AddOnlySection title="Tenant" existing={[...(tenants.data?.items ?? []), ...(added.tenant ?? [])]} fields={[
        { name: 'tenant_type_id', label: 'Tenant type', type: 'select', required: true, options: options(tenantTypes.items) }, { name: 'tenant_type_other', label: 'Specify other tenant type', visible: (form) => Number(form.tenant_type_id) === otherTenantTypeId }, { name: 'name', label: 'Name', required: true }, { name: 'father_name', label: 'Father name' }, { name: 'nid_number', label: 'NID' }, { name: 'mobile', label: 'Mobile' }, { name: 'district_id', label: 'District', type: 'select', options: options(districts.items) }, { name: 'upazila_id', label: 'Upazila', type: 'number' }, { name: 'age', label: 'Age', type: 'number', min: 0 }, { name: 'gender_id', label: 'Gender', type: 'select', options: options(genders.items) }, { name: 'gender_other', label: 'Specify other gender', visible: otherGenderField }, { name: 'occupation_id', label: 'Occupation', type: 'select', options: options(occupations.items) }, { name: 'occupation_other', label: 'Specify other occupation', visible: otherOccupationField }, { name: 'annual_income', label: 'Annual income', type: 'number', min: 0, step: '0.01' }, { name: 'infrastructure_ids', label: 'Structures', type: 'multiselect', options: allStructures.map((structure) => ({ value: Number(structure.infrastructure_id), label: display(structure.infrastructure_type) })) }, { name: 'address', label: 'Address', type: 'textarea' }, { name: 'agreement_number', label: 'Agreement number' }, { name: 'monthly_rent', label: 'Monthly rent', type: 'number', min: 0, step: '0.01' }, { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]} idKey="tenant_id" columns={[column('Name', 'name'), column('Type', 'tenant_type'), column('EP ID', 'ep_id'), column('Rent', 'monthly_rent')]} create={(payload) => createTenant(epId, { ...payload, annual_income: numeric(payload.annual_income), monthly_rent: numeric(payload.monthly_rent), infrastructure_ids: Array.isArray(payload.infrastructure_ids) ? payload.infrastructure_ids.map(Number) : [] })} onCreated={addLocal('tenant')} update={(id, payload) => updateTenant(epId, id, { ...payload, annual_income: numeric(payload.annual_income), monthly_rent: numeric(payload.monthly_rent), infrastructure_ids: Array.isArray(payload.infrastructure_ids) ? payload.infrastructure_ids.map(Number) : [] } as never)} remove={(id) => deleteTenant(epId, id)} />}
      {step === 8 && <AddOnlySection title="Business" existing={[...(businesses.data?.items ?? []), ...(added.business ?? [])]} fields={[
        { name: 'business_ownership_type_id', label: 'Ownership', type: 'select', required: true, options: options(businessOwnershipTypes.items) }, { name: 'business_ownership_type_other', label: 'Specify other ownership', visible: (form) => Number(form.business_ownership_type_id) === otherBusinessOwnershipId }, { name: 'tenant_id', label: 'Tenant', type: 'select', options: allTenants.map((tenant) => ({ value: Number(tenant.tenant_id), label: display(tenant.name) })) }, { name: 'business_type_id', label: 'Business type', type: 'select', required: true, options: options(businessTypes.items) }, { name: 'business_type_other', label: 'Specify other business type', visible: (form) => Number(form.business_type_id) === otherBusinessTypeId }, { name: 'business_category_id', label: 'Business category', type: 'select', required: true, options: options(businessCategories.items) }, { name: 'business_category_other', label: 'Specify other business category', visible: (form) => Number(form.business_category_id) === otherBusinessCategoryId }, { name: 'business_name', label: 'Business name', required: true }, { name: 'capital_amount', label: 'Capital amount', type: 'number', required: true, min: 0, step: '0.01' }, { name: 'annual_income', label: 'Annual income', type: 'number', min: 0, step: '0.01' }, { name: 'has_wage_labour', label: 'Has wage labour', type: 'checkbox' }, { name: 'number_of_wage_labour', label: 'Wage labour count', type: 'number', min: 0 }, { name: 'has_income_tax', label: 'Has income tax', type: 'checkbox' }, { name: 'income_tax_id', label: 'Income tax ID' }, { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]} idKey="business_id" columns={[column('Name', 'business_name'), column('Type', 'business_type'), column('Capital', 'capital_amount')]} create={(payload) => createBusiness(epId, { ...payload, capital_amount: numeric(payload.capital_amount), annual_income: numeric(payload.annual_income) })} onCreated={addLocal('business')} update={(id, payload) => updateBusiness(epId, id, { ...payload, capital_amount: numeric(payload.capital_amount), annual_income: numeric(payload.annual_income) } as never)} remove={(id) => deleteBusiness(epId, id)} />}
      {step === 9 && <div className="space-y-6">
        <AddOnlySection title="Wage labour" existing={[...(workers.data?.items ?? []), ...(added.worker ?? [])]} fields={[
          { name: 'business_id', label: 'Business', type: 'select', options: allBusinesses.map((business) => ({ value: Number(business.business_id), label: display(business.business_name) })) }, { name: 'name', label: 'Name', required: true }, { name: 'father_name', label: 'Father name' }, { name: 'mobile', label: 'Mobile' }, { name: 'nid_number', label: 'NID' }, { name: 'mouza', label: 'Mouza' }, { name: 'union_name', label: 'Union' }, { name: 'district_id', label: 'District', type: 'select', options: options(districts.items) }, { name: 'upazila_id', label: 'Upazila', type: 'number' }, { name: 'total_family_member', label: 'Family members', type: 'number', min: 0 }, { name: 'duration_of_employment_month', label: 'Employment months', type: 'number', min: 0 }, { name: 'gender_id', label: 'Gender', type: 'select', required: true, options: options(genders.items) }, { name: 'gender_other', label: 'Specify other gender', visible: otherGenderField }, { name: 'age', label: 'Age', type: 'number', min: 0 }, { name: 'occupation_id', label: 'Occupation', type: 'select', options: options(occupations.items) }, { name: 'occupation_other', label: 'Specify other occupation', visible: otherOccupationField }, { name: 'employment_type_id', label: 'Employment type', type: 'select', options: options(employmentTypes.items) }, { name: 'employment_type_other', label: 'Specify other employment type', visible: (form) => Number(form.employment_type_id) === otherEmploymentTypeId }, { name: 'monthly_income', label: 'Monthly income', type: 'number', required: true, min: 0, step: '0.01' }, { name: 'remarks', label: 'Remarks', type: 'textarea' },
        ]} idKey="worker_id" columns={[column('Name', 'name'), column('Business', 'business_name'), column('Income', 'monthly_income')]} create={(payload) => createWorker(epId, { ...payload, business_id: payload.business_id ? Number(payload.business_id) : null, monthly_income: numeric(payload.monthly_income) })} onCreated={addLocal('worker')} update={(id, payload) => updateWorker(epId, id, { ...payload, business_id: payload.business_id ? Number(payload.business_id) : null, monthly_income: numeric(payload.monthly_income) } as never)} remove={(id) => deleteWorker(epId, id)} />
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-5">
          <h2 className="text-lg font-semibold text-blue-900">Additional compensation</h2>
          <p className="mt-1 text-sm text-blue-800">Link this payment to a loss category with its amount. Categories already added in this additional payment are unavailable; original paid rows stay locked. Structure, land, tree, crop and business compensations (including grants) are also calculated automatically from the new records when the voucher is created.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_12rem_auto]">
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="form-select">
              <option value="">Select loss category</option>
              {availableCategories.map((item) => <option key={item} value={item}>{COMPENSATION_LABELS[item] ?? item}</option>)}
            </select>
            <input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" className="form-input" />
            <button type="button" onClick={() => void addCompensation()} disabled={compSaving} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{compSaving ? 'Adding...' : 'Add compensation'}</button>
          </div>
          {compError && <p className="mt-2 text-sm text-red-700">{compError}</p>}
          {existingCompensations.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded border border-blue-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-blue-50 text-left text-xs uppercase text-blue-800">
                  <tr><th className="px-3 py-2">Category</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Payment cycle</th><th className="px-3 py-2">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {existingCompensations.map((item: Compensation) => (
                    <tr key={item.compensation_id}>
                      <td className="px-3 py-2">{COMPENSATION_LABELS[item.category] ?? item.category}</td>
                      <td className="px-3 py-2">{item.approved_amount}</td>
                      <td className="px-3 py-2">{item.payment_cycle_label ?? 'Paid in 1st Payment'} {item.is_locked === false && <span className="ml-1 text-emerald-700">(Editable)</span>}</td>
                      <td className="px-3 py-2">
                        {item.is_locked === false ? (
                          <>
                            <button type="button" onClick={() => { setEditingCompensationId(item.compensation_id); setEditingCompAmount(item.approved_amount); setEditingCompRemarks(item.remarks ?? ''); setEditingCompError(null); }} className="rounded border border-blue-300 px-2 py-1 text-blue-700">Edit</button>
                            <button type="button" onClick={() => { if (window.confirm('Delete this additional compensation?')) void deleteCompensation(epId, item.compensation_id).then(() => queryClient.invalidateQueries({ queryKey: ['compensations', epId] })).catch((cause: { message?: string }) => setCompError(cause.message ?? 'Additional compensation could not be deleted.')); }} className="ml-1 rounded border border-red-300 px-2 py-1 text-red-700">Delete</button>
                          </>
                        ) : <span className="text-xs text-gray-500">🔒 Locked</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {editingCompensationId !== null && (
            <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase text-amber-700">Edit additional compensation</p>
              {editingCompError && <p className="mb-2 text-sm text-red-700">{editingCompError}</p>}
              <div className="flex flex-wrap gap-2">
                <input type="number" min="0.01" step="0.01" value={editingCompAmount} onChange={(event) => setEditingCompAmount(event.target.value)} className="form-input" />
                <input value={editingCompRemarks} onChange={(event) => setEditingCompRemarks(event.target.value)} placeholder="Remarks" className="form-input min-w-64" />
                <button type="button" onClick={() => void saveCompensationEdit()} className="rounded bg-amber-600 px-3 py-2 text-sm text-white">Save</button>
                <button type="button" onClick={() => setEditingCompensationId(null)} className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700">Cancel</button>
              </div>
            </div>
          )}
        </section>
      </div>}
    </PageLayout>
  );
}
