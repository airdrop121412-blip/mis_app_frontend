// ═══════════════════════════════════════════════════════════════
// EPDetail — Full detail view for an Affected Person
// Phase 4B-10B / 4B-10C
//
// Shows: Personal info, status actions, tabs for nested entities,
// validation issues, correction audit trail.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEp, useSubmitEp, useVerifyEp, useApproveEp, useEpHistory, useInfrastructures } from '../../hooks/useEp';
import { useEc, useApproveEc } from '../../hooks/useEc';
import {
  listFamilyMembers, createFamilyMember, updateFamilyMember, deleteFamilyMember,
  listLands, createLand, updateLand, deleteLand,
  listTrees, createTree, updateTree, deleteTree,
  listInfrastructures, createInfrastructure, updateInfrastructure, deleteInfrastructure,
  listTenants, createTenant, updateTenant, deleteTenant,
  listWorkers, createWorker, updateWorker, deleteWorker,
  listBusinesses, createBusiness, updateBusiness, deleteBusiness,
  listCrops, createCrop, updateCrop, deleteCrop,
  getLandAssessment, createLandAssessment, updateLandAssessment, deleteLandAssessment,
  getTreeAssessment, createTreeAssessment, updateTreeAssessment, deleteTreeAssessment,
  getInfrastructureAssessment, createInfrastructureAssessment, updateInfrastructureAssessment, deleteInfrastructureAssessment,
  getCropAssessment, createCropAssessment, updateCropAssessment, deleteCropAssessment,
  getWorkerAssessment, createWorkerAssessment, updateWorkerAssessment, deleteWorkerAssessment,
  getBusinessLoss, createBusinessLoss, updateBusinessLoss, deleteBusinessLoss,
  fetchRates,
} from '../../api/ep';
import { validateEp } from '../../api/validation';
import { fetchCorrectionHistory } from '../../api/correctionAudit';
import {
  useRelationships, useGenders, useOccupations,
  useLandStatuses, useLandTypes, useOwnershipTypes, useLandUseTypes, useUnits,
  useTreeTypes, useTreeAgeCategories, useInfrastructureTypes, useUsageTypes,
  useTenantTypes, useEmploymentTypes, useLandDamageTypes, useCropTypes,
  useCropSeasons, useBusinessTypes, useBusinessCategories, useBusinessOwnershipTypes,
  useDistricts, useAllUpazilas,
} from '../../hooks/useMasters';
import { NestedCrud, type CrudField, type CrudColumn } from '../../components/ep/NestedCrud';
import { AssessmentPanel } from '../../components/ep/AssessmentPanel';
import { PageLayout } from '../../components/PageLayout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { StatusBadge } from '../../components/StatusBadge';
import { formatMoney, formatTimestamp } from '../../utils/format';
import type { AffectedPerson, Business, MasterItem, RateItem } from '../../types/ep';
import { useAuth } from '../../contexts/AuthContext';

// ── Tab configuration ────────────────────────────────────────
type TabId = 'personal' | 'family' | 'land' | 'trees' | 'infra' | 'tenants' | 'workers' | 'business' | 'history' | 'validation';

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'personal', label: 'Personal Info', emoji: '👤' },
  { id: 'family', label: 'Family Members', emoji: '👨‍👩‍👧' },
  { id: 'land', label: 'Land', emoji: '🏞️' },
  { id: 'trees', label: 'Trees', emoji: '🌳' },
  { id: 'infra', label: 'Infrastructure', emoji: '🏠' },
  { id: 'tenants', label: 'Tenants', emoji: '🏢' },
  { id: 'workers', label: 'Workers', emoji: '👷' },
  { id: 'business', label: 'Business', emoji: '🏪' },
  { id: 'history', label: 'Status History', emoji: '📋' },
  { id: 'validation', label: 'Validation', emoji: '✅' },
];

export function EPDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const epId = Number(id);
  const { user } = useAuth();
  const tabParam = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : 'personal');

  useEffect(() => {
    if (TABS.some((t) => t.id === tabParam)) setActiveTab(tabParam as TabId);
  }, [tabParam]);

  // ── Fetch EP ────────────────────────────────────────────────
  const { data: ep, isLoading, error } = useEp(epId);
  const { data: ec } = useEc(epId);

  // ── Status transition mutations ─────────────────────────────
  const submitEp = useSubmitEp();
  const verifyEp = useVerifyEp();
  const approveEp = useApproveEp();
  const approveEc = useApproveEc(epId);

  function handleStatusAction(action: 'submit' | 'verify' | 'approve') {
    const fn = action === 'submit' ? submitEp : action === 'verify' ? verifyEp : approveEp;
    if (window.confirm(`Are you sure you want to ${action.toUpperCase()} this EP?`)) {
      fn.mutate(epId);
    }
  }

  function handleApproveEc() {
    if (!window.confirm('Approve this EC? The EC must already be VERIFIED.')) return;
    approveEc.mutate();
  }

  if (isLoading) return <LoadingSpinner message="Loading EP..." />;
  if (error) return <ErrorDisplay message={error instanceof Error ? error.message : 'Failed to load EP'} onRetry={() => navigate(0)} />;
  if (!ep) return <ErrorDisplay message="EP not found." />;

  const isDraft = ep.status === 'DRAFT';
  const isAdmin = user?.roles?.includes('ADMIN') ?? false;
  const canEdit = isDraft || (isAdmin && (ep.status === 'SUBMITTED' || ep.status === 'VERIFIED'));
  const canGenerateFiles = ep.status === 'VERIFIED' || ep.status === 'APPROVED';
  const canGenerateVoucher = ep.status === 'APPROVED';

  return (
    <PageLayout
      title={`${ep.ep_id ?? 'DRAFT'} — ${ep.name}`}
      subtitle={
        <span className="inline-flex items-center gap-2">
          Status: <StatusBadge status={ep.status} />
        </span>
      }
      actions={
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link
              to={`/ep/${epId}/edit`}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Edit
            </Link>
          )}
          {isDraft && (
            <button
              onClick={() => handleStatusAction('submit')}
              disabled={submitEp.isPending}
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Submit for Verification
            </button>
          )}
          {ep.status === 'SUBMITTED' && (
            <button
              onClick={() => handleStatusAction('verify')}
              disabled={verifyEp.isPending}
              className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Verify
            </button>
          )}
          {ep.status === 'VERIFIED' && (
            <button
              onClick={() => handleStatusAction('approve')}
              disabled={approveEp.isPending}
              className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              Approve
            </button>
          )}
          {ec?.status === 'VERIFIED' && (
            <button
              onClick={handleApproveEc}
              disabled={approveEc.isPending}
              className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {approveEc.isPending ? 'Approving EC...' : 'Approve EC'}
            </button>
          )}

          {/* ── Document Print Buttons ───────────────────────── */}
          <div className="border-l border-gray-300 pl-2 ml-1 flex items-center gap-2">
            {canGenerateFiles && (
              <Link
                to={`/ep/${epId}/file`}
                className="rounded bg-gray-100 border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                📄 EP File
              </Link>
            )}
            <Link
              to={`/ep/${epId}/card`}
              className="rounded bg-gray-100 border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              🪪 EP Card
            </Link>
            <Link
              to={`/ep/${epId}/epicad`}
              className="rounded bg-gray-100 border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              📋 EPICAD
            </Link>
            {canGenerateFiles && (
              <Link
                to={`/ep/${epId}/ec`}
                className="rounded bg-gray-100 border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                📄 EC
              </Link>
            )}
            {canGenerateVoucher && (
              <Link
                to={`/ep/${epId}/voucher`}
                className="rounded bg-gray-100 border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                🧾 Voucher
              </Link>
            )}
          </div>
        </div>
      }
    >
      {/* ── Tab Navigation ─────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ────────────────────────────────────────── */}
      <div className="mt-4">
        {activeTab === 'personal' && <PersonalInfo ep={ep} />}
        {activeTab === 'family' && <FamilyMembersTab epId={epId} isDraft={canEdit} />}
        {activeTab === 'land' && <LandTab epId={epId} isDraft={canEdit} />}
        {activeTab === 'trees' && <TreesTab epId={epId} isDraft={canEdit} />}
        {activeTab === 'infra' && <InfrastructureTab epId={epId} isDraft={canEdit} />}
        {activeTab === 'tenants' && <TenantsTab epId={epId} isDraft={canEdit} />}
        {activeTab === 'workers' && <WorkersTab epId={epId} isDraft={canEdit} />}
        {activeTab === 'business' && <BusinessTab epId={epId} isDraft={canEdit} />}
        {activeTab === 'history' && <StatusHistoryTab epId={epId} />}
        {activeTab === 'validation' && <ValidationTab epId={epId} />}
      </div>
    </PageLayout>
  );
}

// ═══════════════════════════════════════════════════════════════
// Personal Info Tab
// ═══════════════════════════════════════════════════════════════

function PersonalInfo({ ep }: { ep: AffectedPerson }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <InfoCard label="EP ID" value={ep.ep_id ?? 'Not assigned yet'} />
      <InfoCard label="HH ID" value={ep.hh_id ?? '—'} />
      <InfoCard label="Name" value={ep.name} />
      <InfoCard label="F/H Name" value={ep.father_name ?? '—'} />
      <InfoCard label="Mother" value={ep.mother_name ?? '—'} />
      <InfoCard label="Spouse" value={ep.spouse_name ?? '—'} />
      <InfoCard label="NID" value={ep.nid_number} />
      <InfoCard label="Mobile" value={ep.mobile} />
      <InfoCard label="Sex" value={ep.gender ?? '—'} />
      <InfoCard label="Date of Birth" value={ep.date_of_birth ?? '—'} />
      <InfoCard label="Age" value={ep.age != null ? String(ep.age) : '—'} />
      <InfoCard label="Religion" value={ep.religion ?? '—'} />
      <InfoCard label="Occupation" value={ep.occupation ?? '—'} />
      <InfoCard label="HHs Head" value={ep.is_household_head ? 'Yes' : 'No'} />
      <InfoCard label="Total Family Member" value={ep.total_family_member != null ? String(ep.total_family_member) : '—'} />
      <InfoCard label="Male" value={ep.male_member != null ? String(ep.male_member) : '—'} />
      <InfoCard label="Female" value={ep.female_member != null ? String(ep.female_member) : '—'} />
      <InfoCard label="District" value={ep.district ?? '—'} />
      <InfoCard label="Upazila" value={ep.upazila ?? '—'} />
      <InfoCard label="Project Phase" value={ep.phase ?? '—'} />
      <InfoCard label="Mouza" value={ep.mouza ?? '—'} />
      <InfoCard label="Union" value={ep.union_name ?? '—'} />
      <InfoCard label="Category of Loss" value={ep.category_of_loss ?? '—'} />
      <InfoCard label="Ownership" value={ep.ownership ?? '—'} />
      <InfoCard label="DC Compensation" value={ep.dc_compensation != null ? formatMoney(ep.dc_compensation) : '—'} />
      <InfoCard label="Cheque No" value={ep.cheque_no ?? '—'} />
      <InfoCard label="Cheque Date" value={ep.cheque_date ?? '—'} />
      <InfoCard label="DC Tree Compensation" value={ep.dc_tree_compensation != null ? formatMoney(ep.dc_tree_compensation) : '—'} />
      <InfoCard label="Tree Cheque No" value={ep.dc_tree_cheque_no ?? '—'} />
      <InfoCard label="Tree Cheque Date" value={ep.dc_tree_cheque_date ?? '—'} />
      <InfoCard label="Yearly Income" value={ep.yearly_income != null ? formatMoney(ep.yearly_income) : '—'} />
      <InfoCard label="Disable" value={ep.is_disabled ? 'Yes' : 'No'} />
      <InfoCard label="Land Less" value={ep.is_landless ? 'Yes' : 'No'} />
      <InfoCard label="Tribal Peoples" value={ep.is_tribal ? 'Yes' : 'No'} />
      <InfoCard label="Business Loss" value={ep.has_business_loss ? 'Yes' : 'No'} />
      <InfoCard label="Shifting Materials" value={ep.shifting_materials ?? '—'} />
      <InfoCard label="Nature of Displacement" value={ep.nature_of_displacement ?? '—'} />
      <InfoCard label="Displacement Status" value={ep.displacement_status ?? '—'} />
      <InfoCard label="Tenant" value={ep.is_tenant ? 'Yes' : 'No'} />
      <InfoCard label="Total Tenant" value={ep.total_tenant != null ? String(ep.total_tenant) : '—'} />
      <InfoCard label="Stamp Duty" value={ep.stamp_duty != null ? formatMoney(ep.stamp_duty) : '—'} />
      <InfoCard label="No Displacement" value={ep.no_displacement ? 'Yes' : 'No'} />
      <InfoCard label="Land Status" value={ep.land_status ?? '—'} />
      <InfoCard label="R/C Type" value={ep.rc_type ?? '—'} />
      <InfoCard label="Monthly Income" value={formatMoney(ep.monthly_income)} />
      <InfoCard label="Monthly Expense" value={formatMoney(ep.monthly_expense)} />
      {ep.gps_latitude && ep.gps_longitude && (
        <>
          <InfoCard label="GPS Lat" value={ep.gps_latitude} />
          <InfoCard label="GPS Lon" value={ep.gps_longitude} />
        </>
      )}
      {ep.remarks && <InfoCard label="Remarks" value={ep.remarks} className="md:col-span-2 lg:col-span-3" />}
    </div>
  );
}

function InfoCard({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-lg border border-gray-100 bg-gray-50 p-3 ${className}`}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

/** Map master items to { value, label } options for form selects. */
function toOptions(items: MasterItem[]): { value: number; label: string }[] {
  return items.map((item) => {
    // The master API serves the PK as 'id'; some resources still expose it
    // as '<entity>_id' (e.g. district/upazila hierarchy lookups excluded here).
    const pk = Object.keys(item).find((k) => k.endsWith('_id') && k !== 'district_id' && k !== 'upazila_id');
    const raw = item.id ?? (pk ? item[pk] : null);
    return { value: Number(raw ?? 0), label: String(item.name ?? item.code ?? '—') };
  });
}

/** Map rate items to { value, label } options for assessment rate selects. */
function rateOptions(rates: RateItem[]): { value: number; label: string }[] {
  return rates.map((r) => {
    const detail = [
      r.land_type, r.land_use_type, r.unit,
      r.tree_type, r.tree_age_category,
      r.infrastructure_type, r.usage_type,
      r.crop_type, r.crop_season,
    ].filter(Boolean).join(' · ');
    return { value: r.rate_id, label: `${detail ? detail + ' — ' : ''}৳${r.rate_per_unit}` };
  });
}

// ═══════════════════════════════════════════════════════════════
// Family Members Tab
// ═══════════════════════════════════════════════════════════════

function FamilyMembersTab({ epId, isDraft }: { epId: number; isDraft: boolean }) {
  const qc = useQueryClient();
  const { items: relationships } = useRelationships();
  const { items: genders } = useGenders();
  const { items: occupations } = useOccupations();

  const onMutated = () => {
    qc.invalidateQueries({ queryKey: ['ep', epId] });
    qc.invalidateQueries({ queryKey: ['ep-validation', epId] });
    qc.invalidateQueries({ queryKey: ['ep-file-data', epId] });
  };

  const fields: CrudField[] = [
    { name: 'relationship_id', label: 'Relationship', type: 'select', options: toOptions(relationships), required: true },
    { name: 'gender_id', label: 'Gender', type: 'select', options: toOptions(genders), required: true },
    { name: 'age', label: 'Age', type: 'number', min: 0 },
    { name: 'occupation_id', label: 'Occupation', type: 'select', options: toOptions(occupations) },
    { name: 'is_dependent', label: 'Dependent?', type: 'checkbox' },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ];

  const columns: CrudColumn<Record<string, unknown>>[] = [
    { header: 'Name', render: (i) => String(i.name ?? '—') },
    { header: 'Relationship', render: (i) => String(i.relationship_other || i.relationship || '—') },
    { header: 'Gender', render: (i) => String(i.gender_other || i.gender || '—') },
    { header: 'Age', render: (i) => String(i.age ?? '—') },
    { header: 'Occupation', render: (i) => String(i.occupation_other || i.occupation || '—') },
    { header: 'Dependent', render: (i) => (i.is_dependent ? 'Yes' : 'No') },
    { header: 'Remarks', render: (i) => String(i.remarks ?? '—') },
  ];

  return (
    <NestedCrud
      title="Family Members"
      epId={epId}
      isDraft={isDraft}
      queryKey={['family-members', epId]}
      listFn={() => listFamilyMembers(epId)}
      createFn={(d) => createFamilyMember(epId, d)}
      updateFn={(id, d) => updateFamilyMember(epId, id, d)}
      deleteFn={(id) => deleteFamilyMember(epId, id)}
      onMutated={onMutated}
      columns={columns}
      fields={fields}
      idKey="family_member_id"
      emptyMessage="No family members recorded yet."
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// Land Tab — Land CRUD + per-land Crops + Land Assessment
// ═══════════════════════════════════════════════════════════════

function LandTab({ epId, isDraft }: { epId: number; isDraft: boolean }) {
  const qc = useQueryClient();
  const { items: landTypes } = useLandTypes();
  const { items: _landStatuses } = useLandStatuses();
  const { items: ownershipTypes } = useOwnershipTypes();
  const { items: units } = useUnits();
  const { items: landUseTypes } = useLandUseTypes();
  const { items: damageTypes } = useLandDamageTypes();
  const { items: cropTypes } = useCropTypes();
  const { items: cropSeasons } = useCropSeasons();

  const onMutated = () => {
    qc.invalidateQueries({ queryKey: ['ep', epId] });
    qc.invalidateQueries({ queryKey: ['ep-validation', epId] });
    qc.invalidateQueries({ queryKey: ['ep-file-data', epId] });
  };

  const fields: CrudField[] = [
    { name: 'land_type_id', label: 'Land Type', type: 'select', options: toOptions(landTypes), required: true },
    { name: 'ownership_type_id', label: 'Ownership', type: 'select', options: toOptions(ownershipTypes), required: true },
    { name: 'la_case_no', label: 'LA Case No', type: 'text' },
    { name: 'mouza', label: 'Mouza', type: 'text' },
    { name: 'khatian_number', label: 'Khatian #', type: 'text' },
    { name: 'dag_number', label: 'Dag #', type: 'text' },
    { name: 'dc_pay_amount', label: 'DC Pay Amount', type: 'number', step: '0.01', min: 0 },
    { name: 'dc_cheque_no', label: 'Cheque No', type: 'text' },
    { name: 'dc_pay_date', label: 'DC Pay Date', type: 'date' },
    { name: 'land_area', label: 'Area', type: 'number', step: '0.0001', min: 0, required: true },
    { name: 'land_area_unit_id', label: 'Area Unit', type: 'select', options: toOptions(units), required: true },
    { name: 'land_use_type_id', label: 'Use Type', type: 'select', options: toOptions(landUseTypes), required: true },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ];

  const columns: CrudColumn<Record<string, unknown>>[] = [
    { header: 'Type', render: (i) => String(i.land_type ?? '—') },
    { header: 'Status', render: (i) => String(i.land_status ?? '—') },
    { header: 'Ownership', render: (i) => String(i.ownership_type ?? '—') },
    { header: 'Area', render: (i) => `${String(i.land_area ?? '—')} ${String(i.land_area_unit ?? '')}` },
    { header: 'Use Type', render: (i) => String(i.land_use_type ?? '—') },
    { header: 'LA Case No', render: (i) => String(i.la_case_no ?? '—') },
    { header: 'Khatian', render: (i) => String(i.khatian_number ?? '—') },
    { header: 'Dag', render: (i) => String(i.dag_number ?? '—') },
  ];

  return (
    <NestedCrud
      title="Land Holdings"
      epId={epId}
      isDraft={isDraft}
      queryKey={['lands', epId]}
      listFn={() => listLands(epId)}
      createFn={(d) => createLand(epId, d)}
      updateFn={(id, d) => updateLand(epId, id, d)}
      deleteFn={(id) => deleteLand(epId, id)}
      onMutated={onMutated}
      columns={columns}
      fields={fields}
      idKey="land_id"
      emptyMessage="No land records yet."
      rowExtra={(land) => (
        <div className="space-y-3">
          <CropsSubList epId={epId} landId={Number(land.land_id)} isDraft={isDraft} onMutated={onMutated} cropTypes={cropTypes} cropSeasons={cropSeasons} units={units} />
          <LandAssessmentPanel epId={epId} landId={Number(land.land_id)} isDraft={isDraft} onMutated={onMutated} damageTypes={damageTypes} units={units} />
        </div>
      )}
    />
  );
}

// ── Crops (nested under Land) ────────────────────────────────
function CropsSubList({
  epId, landId, isDraft, onMutated, cropTypes, cropSeasons, units,
}: {
  epId: number; landId: number; isDraft: boolean; onMutated: () => void;
  cropTypes: MasterItem[]; cropSeasons: MasterItem[]; units: MasterItem[];
}) {
  const fields: CrudField[] = [
    { name: 'crop_type_id', label: 'Crop Type', type: 'select', options: toOptions(cropTypes), required: true },
    { name: 'crop_season_id', label: 'Season', type: 'select', options: toOptions(cropSeasons), required: true },
    { name: 'cultivated_area', label: 'Cultivated Area', type: 'number', step: '0.0001', min: 0, required: true },
    { name: 'area_unit_id', label: 'Area Unit', type: 'select', options: toOptions(units), required: true },
    { name: 'damage_percentage', label: 'Damage %', type: 'number', step: '0.01', min: 0, max: 100, required: true },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ];

  const columns: CrudColumn<Record<string, unknown>>[] = [
    { header: 'Crop', render: (i) => String(i.crop_type ?? '—') },
    { header: 'Season', render: (i) => String(i.crop_season ?? '—') },
    { header: 'Area', render: (i) => `${String(i.cultivated_area ?? '—')} ${String(i.area_unit ?? '')}` },
    { header: 'Damage %', render: (i) => String(i.damage_percentage ?? '—') },
  ];

  return (
    <NestedCrud
      title={`Crops on Land #${landId}`}
      epId={epId}
      isDraft={isDraft}
      queryKey={['crops', epId, landId]}
      listFn={() => listCrops(epId, landId)}
      createFn={(d) => createCrop(epId, landId, d)}
      updateFn={(id, d) => updateCrop(epId, landId, id, d)}
      deleteFn={(id) => deleteCrop(epId, landId, id)}
      onMutated={onMutated}
      columns={columns}
      fields={fields}
      idKey="crop_id"
      emptyMessage="No crops on this land."
      rowExtra={(crop) => (
        <CropAssessmentPanel epId={epId} landId={landId} cropId={Number(crop.crop_id)} isDraft={isDraft} onMutated={onMutated} />
      )}
    />
  );
}

// ── Land Assessment ──────────────────────────────────────────
function LandAssessmentPanel({
  epId, landId, isDraft, onMutated, damageTypes, units,
}: {
  epId: number; landId: number; isDraft: boolean; onMutated: () => void;
  damageTypes: MasterItem[]; units: MasterItem[];
}) {
  const { data: rates } = useQuery({
    queryKey: ['rates', 'land'],
    queryFn: () => fetchRates('land'),
  });

  const fields: CrudField[] = [
    { name: 'damage_type_id', label: 'Damage Type', type: 'select', options: toOptions(damageTypes), required: true },
    { name: 'affected_area', label: 'Affected Area', type: 'number', step: '0.0001', min: 0, required: true },
    { name: 'unit_id', label: 'Unit', type: 'select', options: toOptions(units), required: true },
    { name: 'rate_id', label: 'Rate', type: 'select', options: rateOptions(rates ?? []), required: true },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ];

  return (
    <AssessmentPanel
      title="Land Assessment"
      epId={epId}
      parentId={landId}
      isDraft={isDraft}
      queryKey={['land-assessment', epId, landId]}
      getFn={() => getLandAssessment(epId, landId)}
      createFn={(d) => createLandAssessment(epId, landId, d)}
      updateFn={(d) => updateLandAssessment(epId, landId, d)}
      deleteFn={() => deleteLandAssessment(epId, landId)}
      onMutated={onMutated}
      fields={fields}
      rateOptions={rateOptions(rates ?? [])}
      summary={(a) => (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span>Damage: <b>{String(a.damage_type ?? '—')}</b></span>
          <span>Area: <b>{String(a.affected_area ?? '—')}</b></span>
          <span>Rate: <b>৳{String(a.rate_per_unit ?? '—')}</b></span>
          <span className="font-semibold text-green-700">Assessed Loss: ৳{String(a.assessed_loss ?? '—')}</span>
        </div>
      )}
      emptyMessage="No land assessment yet."
    />
  );
}

// ── Crop Assessment ──────────────────────────────────────────
function CropAssessmentPanel({
  epId, landId, cropId, isDraft, onMutated,
}: {
  epId: number; landId: number; cropId: number; isDraft: boolean; onMutated: () => void;
}) {
  const { data: rates } = useQuery({
    queryKey: ['rates', 'crop'],
    queryFn: () => fetchRates('crop'),
  });

  const fields: CrudField[] = [
    { name: 'rate_id', label: 'Rate', type: 'select', options: rateOptions(rates ?? []), required: true },
    { name: 'cultivated_area', label: 'Cultivated Area', type: 'number', step: '0.0001', min: 0, required: true },
    { name: 'damage_percentage', label: 'Damage %', type: 'number', step: '0.01', min: 0, max: 100, required: true },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ];

  return (
    <AssessmentPanel
      title="Crop Assessment"
      epId={epId}
      parentId={cropId}
      isDraft={isDraft}
      queryKey={['crop-assessment', epId, landId, cropId]}
      getFn={() => getCropAssessment(epId, landId, cropId)}
      createFn={(d) => createCropAssessment(epId, landId, cropId, d)}
      updateFn={(d) => updateCropAssessment(epId, landId, cropId, d)}
      deleteFn={() => deleteCropAssessment(epId, landId, cropId)}
      onMutated={onMutated}
      fields={fields}
      rateOptions={rateOptions(rates ?? [])}
      summary={(a) => (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span>Area: <b>{String(a.cultivated_area ?? '—')}</b></span>
          <span>Damage: <b>{String(a.damage_percentage ?? '—')}%</b></span>
          <span>Rate: <b>৳{String(a.rate_per_unit ?? '—')}</b></span>
          <span className="font-semibold text-green-700">Assessed Loss: ৳{String(a.assessed_loss ?? '—')}</span>
        </div>
      )}
      emptyMessage="No crop assessment yet."
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// Trees Tab — Tree CRUD + Tree Assessment
// ═══════════════════════════════════════════════════════════════

function TreesTab({ epId, isDraft }: { epId: number; isDraft: boolean }) {
  const qc = useQueryClient();
  const { items: treeTypes } = useTreeTypes();
  const { items: ageCategories } = useTreeAgeCategories();

  const onMutated = () => {
    qc.invalidateQueries({ queryKey: ['ep', epId] });
    qc.invalidateQueries({ queryKey: ['ep-validation', epId] });
    qc.invalidateQueries({ queryKey: ['ep-file-data', epId] });
  };

  const fields: CrudField[] = [
    { name: 'tree_type_id', label: 'Tree Type', type: 'select', options: toOptions(treeTypes), required: true },
    { name: 'tree_age_category_id', label: 'Age Category', type: 'select', options: toOptions(ageCategories), required: true },
    { name: 'quantity', label: 'Quantity', type: 'number', min: 1, required: true },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ];

  const columns: CrudColumn<Record<string, unknown>>[] = [
    { header: 'Tree Type', render: (i) => String(i.tree_type ?? '—') },
    { header: 'Age Category', render: (i) => String(i.tree_age_category ?? '—') },
    { header: 'Quantity', render: (i) => String(i.quantity ?? '—') },
  ];

  return (
    <NestedCrud
      title="Trees"
      epId={epId}
      isDraft={isDraft}
      queryKey={['trees', epId]}
      listFn={() => listTrees(epId)}
      createFn={(d) => createTree(epId, d)}
      updateFn={(id, d) => updateTree(epId, id, d)}
      deleteFn={(id) => deleteTree(epId, id)}
      onMutated={onMutated}
      columns={columns}
      fields={fields}
      idKey="tree_id"
      emptyMessage="No trees recorded."
      rowExtra={(tree) => (
        <TreeAssessmentPanel epId={epId} treeId={Number(tree.tree_id)} isDraft={isDraft} onMutated={onMutated} />
      )}
    />
  );
}

function TreeAssessmentPanel({
  epId, treeId, isDraft, onMutated,
}: {
  epId: number; treeId: number; isDraft: boolean; onMutated: () => void;
}) {
  const { data: rates } = useQuery({
    queryKey: ['rates', 'tree'],
    queryFn: () => fetchRates('tree'),
  });

  const fields: CrudField[] = [
    { name: 'rate_id', label: 'Rate', type: 'select', options: rateOptions(rates ?? []), required: true },
    { name: 'quantity', label: 'Quantity', type: 'number', min: 1, required: true },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ];

  return (
    <AssessmentPanel
      title="Tree Assessment"
      epId={epId}
      parentId={treeId}
      isDraft={isDraft}
      queryKey={['tree-assessment', epId, treeId]}
      getFn={() => getTreeAssessment(epId, treeId)}
      createFn={(d) => createTreeAssessment(epId, treeId, d)}
      updateFn={(d) => updateTreeAssessment(epId, treeId, d)}
      deleteFn={() => deleteTreeAssessment(epId, treeId)}
      onMutated={onMutated}
      fields={fields}
      rateOptions={rateOptions(rates ?? [])}
      summary={(a) => (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span>Qty: <b>{String(a.quantity ?? '—')}</b></span>
          <span>Rate: <b>৳{String(a.rate_per_tree ?? '—')}</b></span>
          <span className="font-semibold text-green-700">Assessed Loss: ৳{String(a.assessed_loss ?? '—')}</span>
        </div>
      )}
      emptyMessage="No tree assessment yet."
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// Infrastructure Tab — Infra CRUD + Infra Assessment
// ═══════════════════════════════════════════════════════════════

function InfrastructureTab({ epId, isDraft }: { epId: number; isDraft: boolean }) {
  const qc = useQueryClient();
  const { items: infraTypes } = useInfrastructureTypes();
  const { items: usageTypes } = useUsageTypes();

  const onMutated = () => {
    qc.invalidateQueries({ queryKey: ['ep', epId] });
    qc.invalidateQueries({ queryKey: ['ep-validation', epId] });
    qc.invalidateQueries({ queryKey: ['ep-file-data', epId] });
  };

  const fields: CrudField[] = [
    { name: 'infrastructure_type_id', label: 'Type', type: 'select', options: toOptions(infraTypes), required: true },
    { name: 'usage_type_id', label: 'Usage', type: 'select', options: toOptions(usageTypes), required: true },
    { name: 'structure_nature', label: 'Nature', type: 'select', options: [{ value: 'Primary', label: 'Primary' }, { value: 'Secondary', label: 'Secondary' }], required: true },
    { name: 'structure_material', label: 'Material', type: 'select', options: [{ value: 'Pacca', label: 'Pacca' }, { value: 'Semi Pacca', label: 'Semi Pacca' }, { value: 'Tin Made', label: 'Tin Made' }, { value: 'Katcha', label: 'Katcha' }, { value: 'Thatched', label: 'Thatched' }, { value: 'Other', label: 'Other' }], required: true },
    { name: 'structure_material_other', label: 'Specify Other Material', type: 'text' },
    { name: 'length', label: 'Length', type: 'number', step: '0.01', min: 0 },
    { name: 'width', label: 'Width', type: 'number', step: '0.01', min: 0 },
    { name: 'area_sqft', label: 'Area (sqft)', type: 'number', step: '0.01', min: 0, required: true },
    { name: 'damage_percentage', label: 'Damage %', type: 'number', step: '0.01', min: 0, max: 100, required: true },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ];

  const columns: CrudColumn<Record<string, unknown>>[] = [
    { header: 'Type', render: (i) => String(i.infrastructure_type ?? '—') },
    { header: 'Usage', render: (i) => String(i.usage_type ?? '—') },
    { header: 'Nature', render: (i) => String(i.structure_nature ?? '—') },
    { header: 'Material', render: (i) => (i.structure_material === 'Other' && i.structure_material_other ? String(i.structure_material_other) : String(i.structure_material ?? '—')) },
    { header: 'Length', render: (i) => String(i.length ?? '—') },
    { header: 'Width', render: (i) => String(i.width ?? '—') },
    { header: 'Area (sqft)', render: (i) => String(i.area_sqft ?? '—') },
    { header: 'Damage %', render: (i) => String(i.damage_percentage ?? '—') },
  ];

  return (
    <NestedCrud
      title="Infrastructure"
      epId={epId}
      isDraft={isDraft}
      queryKey={['infrastructures', epId]}
      listFn={() => listInfrastructures(epId)}
      createFn={(d) => createInfrastructure(epId, d)}
      updateFn={(id, d) => updateInfrastructure(epId, id, d)}
      deleteFn={(id) => deleteInfrastructure(epId, id)}
      onMutated={onMutated}
      columns={columns}
      fields={fields}
      idKey="infrastructure_id"
      emptyMessage="No infrastructure recorded."
      rowExtra={(infra) => (
        <InfrastructureAssessmentPanel epId={epId} infraId={Number(infra.infrastructure_id)} isDraft={isDraft} onMutated={onMutated} />
      )}
    />
  );
}

function InfrastructureAssessmentPanel({
  epId, infraId, isDraft, onMutated,
}: {
  epId: number; infraId: number; isDraft: boolean; onMutated: () => void;
}) {
  const { data: rates } = useQuery({
    queryKey: ['rates', 'infrastructure'],
    queryFn: () => fetchRates('infrastructure'),
  });

  const fields: CrudField[] = [
    { name: 'rate_id', label: 'Rate', type: 'select', options: rateOptions(rates ?? []), required: true },
    { name: 'area_sqft', label: 'Area (sqft)', type: 'number', step: '0.01', min: 0, required: true },
    { name: 'damage_percentage', label: 'Damage %', type: 'number', step: '0.01', min: 0, max: 100, required: true },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ];

  return (
    <AssessmentPanel
      title="Infrastructure Assessment"
      epId={epId}
      parentId={infraId}
      isDraft={isDraft}
      queryKey={['infrastructure-assessment', epId, infraId]}
      getFn={() => getInfrastructureAssessment(epId, infraId)}
      createFn={(d) => createInfrastructureAssessment(epId, infraId, d)}
      updateFn={(d) => updateInfrastructureAssessment(epId, infraId, d)}
      deleteFn={() => deleteInfrastructureAssessment(epId, infraId)}
      onMutated={onMutated}
      fields={fields}
      rateOptions={rateOptions(rates ?? [])}
      summary={(a) => (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span>Area: <b>{String(a.area_sqft ?? '—')} sqft</b></span>
          <span>Damage: <b>{String(a.damage_percentage ?? '—')}%</b></span>
          <span>Rate: <b>৳{String(a.rate_per_sqft ?? '—')}</b></span>
          <span className="font-semibold text-green-700">Assessed Loss: ৳{String(a.assessed_loss ?? '—')}</span>
        </div>
      )}
      emptyMessage="No infrastructure assessment yet."
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// Tenants Tab
// ═══════════════════════════════════════════════════════════════

function TenantsTab({ epId, isDraft }: { epId: number; isDraft: boolean }) {
  const qc = useQueryClient();
  const { items: tenantTypes } = useTenantTypes();
  const { items: genders } = useGenders();
  const { items: occupations } = useOccupations();
  const { items: districts } = useDistricts();
  const otherTenantOccupationId = Number(occupations.find((o) => String(o.name).toLowerCase() === 'other')?.id) || 0;
  const { items: allUpazilas } = useAllUpazilas();
  const { data: structureData } = useInfrastructures(epId);

  // Structures are serialised to Sl No in ascending infrastructure_id order
  // (same order the EP File uses), so the multi-select labels match.
  const sortedStructures = [...(structureData?.items ?? [])].sort(
    (a, b) => Number(a.infrastructure_id) - Number(b.infrastructure_id),
  );
  const structureOptions = sortedStructures.map((s, i) => ({
    value: Number(s.infrastructure_id),
    label: `#${i + 1} · ${s.infrastructure_type ?? 'Structure'}`,
  }));

  const onMutated = () => {
    qc.invalidateQueries({ queryKey: ['ep', epId] });
    qc.invalidateQueries({ queryKey: ['ep-validation', epId] });
    qc.invalidateQueries({ queryKey: ['ep-file-data', epId] });
  };

  const fields: CrudField[] = [
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
    { name: 'occupation_other', label: 'Specify Occupation', type: 'text', placeholder: 'Type the occupation', visible: (form) => Number(form.occupation_id) === otherTenantOccupationId },
    { name: 'annual_income', label: 'Annual Income (৳)', type: 'number', step: '0.01', min: 0 },
    { name: 'address', label: 'Address', type: 'textarea' },
    { name: 'agreement_number', label: 'Agreement #', type: 'text' },
    { name: 'monthly_rent', label: 'Monthly Rent (৳)', type: 'number', step: '0.01', min: 0 },
    {
      name: 'infrastructure_ids',
      label: 'Rented Structure(s) — Sl No',
      type: 'multiselect',
      options: structureOptions,
      help: 'Select every structure this tenant rents. Each selection is kept against its Structure Sl No.',
    },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ];

  const columns: CrudColumn<Record<string, unknown>>[] = [
    { header: 'EP ID No', render: (i) => String(i.ep_id ?? '—') },
    { header: 'HH ID', render: (i) => String(i.hh_id ?? '—') },
    { header: 'Tenant Name', render: (i) => String(i.name ?? '—') },
    { header: 'Type', render: (i) => String(i.tenant_type ?? '—') },
    {
      header: 'Structure(s)',
      render: (i) => {
        const ids = Array.isArray(i.infrastructure_ids) ? (i.infrastructure_ids as number[]) : [];
        return ids.length > 0 ? `#${ids.join(', #')}` : String(i.infrastructure_id ?? '—');
      },
    },
    { header: 'Occupation', render: (i) => {
      const name = String(i.occupation_name ?? '');
      return (/other/i.test(name) && i.occupation_other ? String(i.occupation_other) : name) || '—';
    } },
    { header: 'Annual Income', render: (i) => String(i.annual_income ?? '—') },
    { header: 'NID', render: (i) => String(i.nid_number ?? '—') },
    { header: 'Mobile', render: (i) => String(i.mobile ?? '—') },
  ];

  return (
    <NestedCrud
      title="Tenants"
      epId={epId}
      isDraft={isDraft}
      queryKey={['tenants', epId]}
      listFn={() => listTenants(epId)}
      createFn={(d) => createTenant(epId, d)}
      updateFn={(id, d) => updateTenant(epId, id, d)}
      deleteFn={(id) => deleteTenant(epId, id)}
      onMutated={onMutated}
      columns={columns}
      fields={fields}
      idKey="tenant_id"
      emptyMessage="No tenants recorded."
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// Workers Tab — Worker CRUD + Worker Assessment
// ═══════════════════════════════════════════════════════════════

function WorkersTab({ epId, isDraft }: { epId: number; isDraft: boolean }) {
  const qc = useQueryClient();
  const { items: genders } = useGenders();
  const { items: occupations } = useOccupations();
  const { items: employmentTypes } = useEmploymentTypes();
  const { items: districts } = useDistricts();
  const { items: allUpazilas } = useAllUpazilas();
  const { data: businessesData } = useQuery({
    queryKey: ['businesses', epId],
    queryFn: () => listBusinesses(epId),
  });
  const businesses: Business[] = businessesData?.items ?? [];

  const onMutated = () => {
    qc.invalidateQueries({ queryKey: ['ep', epId] });
    qc.invalidateQueries({ queryKey: ['ep-validation', epId] });
    qc.invalidateQueries({ queryKey: ['ep-file-data', epId] });
  };

  const fields: CrudField[] = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'business_id', label: 'Business Owner', type: 'select', options: businesses.map((b: Business) => ({ value: Number(b.business_id), label: b.business_name })) },
    { name: 'father_name', label: "Father's Name", type: 'text' },
    { name: 'mobile', label: 'Mobile No', type: 'text' },
    { name: 'nid_number', label: 'NID No', type: 'text' },
    { name: 'mouza', label: 'Mouza', type: 'text' },
    { name: 'union_name', label: 'Union', type: 'text' },
    { name: 'district_id', label: 'District', type: 'select', options: toOptions(districts) },
    { name: 'upazila_id', label: 'Upazila', type: 'select', options: toOptions(allUpazilas) },
    { name: 'total_family_member', label: 'Total Family Member', type: 'number', min: 0 },
    { name: 'duration_of_employment_month', label: 'Duration of Employment (Month)', type: 'number', min: 0 },
    { name: 'gender_id', label: 'Gender', type: 'select', options: toOptions(genders), required: true },
    { name: 'age', label: 'Age', type: 'number', min: 0 },
    { name: 'occupation_id', label: 'Occupation', type: 'select', options: toOptions(occupations) },
    { name: 'employment_type_id', label: 'Employment Type', type: 'select', options: toOptions(employmentTypes) },
    { name: 'monthly_income', label: 'Monthly Income (৳)', type: 'number', step: '0.01', min: 0, required: true },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ];

  const columns: CrudColumn<Record<string, unknown>>[] = [
    { header: 'Business Owner', render: (i) => String(i.business_name ?? '—') },
    { header: 'Name', render: (i) => String(i.name ?? '—') },
    { header: "Father's Name", render: (i) => String(i.father_name ?? '—') },
    { header: 'Mobile No', render: (i) => String(i.mobile ?? '—') },
    { header: 'NID No', render: (i) => String(i.nid_number ?? '—') },
    { header: 'Gender', render: (i) => String(i.gender ?? '—') },
    { header: 'Age', render: (i) => String(i.age ?? '—') },
    { header: 'Employment', render: (i) => String(i.employment_type ?? '—') },
    { header: 'Monthly Income', render: (i) => formatMoney(String(i.monthly_income ?? '0')) },
  ];

  return (
    <NestedCrud
      title="Workers"
      epId={epId}
      isDraft={isDraft}
      queryKey={['workers', epId]}
      listFn={() => listWorkers(epId)}
      createFn={(d) => createWorker(epId, d)}
      updateFn={(id, d) => updateWorker(epId, id, d)}
      deleteFn={(id) => deleteWorker(epId, id)}
      onMutated={onMutated}
      columns={columns}
      fields={fields}
      idKey="worker_id"
      emptyMessage="No workers recorded."
      rowExtra={(worker) => (
        <WorkerAssessmentPanel epId={epId} workerId={Number(worker.worker_id)} isDraft={isDraft} onMutated={onMutated} />
      )}
    />
  );
}

function WorkerAssessmentPanel({
  epId, workerId, isDraft, onMutated,
}: {
  epId: number; workerId: number; isDraft: boolean; onMutated: () => void;
}) {
  const fields: CrudField[] = [
    { name: 'loss_amount', label: 'Loss Amount (৳)', type: 'number', step: '0.01', min: 0, required: true },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ];

  return (
    <AssessmentPanel
      title="Worker Assessment"
      epId={epId}
      parentId={workerId}
      isDraft={isDraft}
      queryKey={['worker-assessment', epId, workerId]}
      getFn={() => getWorkerAssessment(epId, workerId)}
      createFn={(d) => createWorkerAssessment(epId, workerId, d)}
      updateFn={(d) => updateWorkerAssessment(epId, workerId, d)}
      deleteFn={() => deleteWorkerAssessment(epId, workerId)}
      onMutated={onMutated}
      fields={fields}
      rateOptions={[]}
      summary={(a) => (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="font-semibold text-green-700">Loss Amount: ৳{String(a.loss_amount ?? '—')}</span>
        </div>
      )}
      emptyMessage="No worker assessment yet."
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// Business Tab — Business CRUD + Business Loss
// ═══════════════════════════════════════════════════════════════

function BusinessTab({ epId, isDraft }: { epId: number; isDraft: boolean }) {
  const qc = useQueryClient();
  const { items: ownershipTypes } = useBusinessOwnershipTypes();
  const { items: businessTypes } = useBusinessTypes();
  const { items: businessCategories } = useBusinessCategories();

  const onMutated = () => {
    qc.invalidateQueries({ queryKey: ['ep', epId] });
    qc.invalidateQueries({ queryKey: ['ep-validation', epId] });
    qc.invalidateQueries({ queryKey: ['ep-file-data', epId] });
  };

  const fields: CrudField[] = [
    { name: 'business_ownership_type_id', label: 'Ownership Type', type: 'select', options: toOptions(ownershipTypes), required: true },
    { name: 'business_type_id', label: 'Business Type', type: 'select', options: toOptions(businessTypes), required: true },
    { name: 'business_category_id', label: 'Category', type: 'select', options: toOptions(businessCategories), required: true },
    { name: 'business_name', label: 'Business Name', type: 'text', required: true },
    { name: 'capital_amount', label: 'Capital (৳)', type: 'number', step: '0.01', min: 0, required: true },
    { name: 'has_income_tax', label: 'Has Income Tax?', type: 'checkbox' },
    { name: 'income_tax_id', label: 'Income Tax ID', type: 'text' },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ];

  const columns: CrudColumn<Record<string, unknown>>[] = [
    { header: 'Name', render: (i) => String(i.business_name ?? '—') },
    { header: 'Type', render: (i) => String(i.business_type ?? '—') },
    { header: 'Category', render: (i) => String(i.business_category ?? '—') },
    { header: 'Ownership', render: (i) => String(i.business_ownership_type ?? '—') },
    { header: 'Capital', render: (i) => formatMoney(String(i.capital_amount ?? '0')) },
    { header: 'Annual Income', render: (i) => formatMoney(String(i.annual_income ?? '0')) },
    { header: 'Wage Labour', render: (i) => (i.has_wage_labour ? (i.number_of_wage_labour != null ? String(i.number_of_wage_labour) : 'Yes') : 'No') },
    { header: 'Income Tax', render: (i) => (i.has_income_tax ? 'Yes' : 'No') },
  ];

  return (
    <NestedCrud
      title="Businesses"
      epId={epId}
      isDraft={isDraft}
      queryKey={['businesses', epId]}
      listFn={() => listBusinesses(epId)}
      createFn={(d) => createBusiness(epId, d)}
      updateFn={(id, d) => updateBusiness(epId, id, d)}
      deleteFn={(id) => deleteBusiness(epId, id)}
      onMutated={onMutated}
      columns={columns}
      fields={fields}
      idKey="business_id"
      emptyMessage="No businesses recorded."
      rowExtra={(business) => (
        <BusinessLossPanel epId={epId} businessId={Number(business.business_id)} isDraft={isDraft} onMutated={onMutated} />
      )}
    />
  );
}

function BusinessLossPanel({
  epId, businessId, isDraft, onMutated,
}: {
  epId: number; businessId: number; isDraft: boolean; onMutated: () => void;
}) {
  const fields: CrudField[] = [
    { name: 'loss_amount', label: 'Loss Amount (৳)', type: 'number', step: '0.01', min: 0, required: true },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ];

  return (
    <AssessmentPanel
      title="Business Loss"
      epId={epId}
      parentId={businessId}
      isDraft={isDraft}
      queryKey={['business-loss', epId, businessId]}
      getFn={() => getBusinessLoss(epId, businessId)}
      createFn={(d) => createBusinessLoss(epId, businessId, d)}
      updateFn={(d) => updateBusinessLoss(epId, businessId, d)}
      deleteFn={() => deleteBusinessLoss(epId, businessId)}
      onMutated={onMutated}
      fields={fields}
      rateOptions={[]}
      summary={(a) => (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="font-semibold text-green-700">Loss Amount: ৳{String(a.loss_amount ?? '—')}</span>
        </div>
      )}
      emptyMessage="No business loss recorded."
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// Status History Tab
// ═══════════════════════════════════════════════════════════════

function StatusHistoryTab({ epId }: { epId: number }) {
  const { data: history, isLoading } = useEpHistory(epId);

  if (isLoading) return <LoadingSpinner message="Loading history..." />;
  if (!history || history.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No status history recorded.</p>;
  }

  return (
    <div className="space-y-3">
      {history.map((entry) => (
        <div key={entry.status_history_id} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
          <div className="mt-0.5 h-3 w-3 flex-shrink-0 rounded-full bg-blue-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {entry.previous_status ?? '—'} → {entry.new_status}
            </p>
            <p className="text-xs text-gray-500">
              {formatTimestamp(entry.changed_at)}
              {entry.changedBy && ` by ${entry.changedBy.full_name}`}
              {entry.remarks && ` — ${entry.remarks}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Validation Tab — Phase 4B-10C integration
// Calls the centralized ValidationService via API
// ═══════════════════════════════════════════════════════════════

function ValidationTab({ epId }: { epId: number }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ep-validation', epId],
    queryFn: () => validateEp(epId),
  });

  const { data: corrections } = useQuery({
    queryKey: ['ep-corrections', epId],
    queryFn: () => fetchCorrectionHistory('AffectedPerson', epId),
  });

  if (isLoading) return <LoadingSpinner message="Running validation checks..." />;
  if (error) return <ErrorDisplay message="Failed to run validation" onRetry={() => refetch()} />;

  const result = data as unknown as Record<string, unknown> | null;
  const issues = (result?.issues as unknown[]) ?? [];
  const isReady = result?.ready === true;

  return (
    <div className="space-y-6">
      {/* ── Validation Status ──────────────────────────────── */}
      <div className={`rounded-lg border p-4 ${isReady ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
        <p className={`text-sm font-semibold ${isReady ? 'text-green-800' : 'text-amber-800'}`}>
          {isReady ? '✅ EP is ready for EPICAD generation' : '⚠️ EP has validation issues — must be fixed before EPICAD'}
        </p>
      </div>

      {/* ── Issues List ─────────────────────────────────────── */}
      {issues.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="mb-2 text-sm font-semibold text-gray-700">Issues ({issues.length})</h4>
          <ul className="space-y-2">
            {issues.map((issue: unknown, i: number) => {
              const issueObj = issue as Record<string, unknown>;
              return (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 inline-block h-2 w-2 flex-shrink-0 rounded-full ${
                    issueObj.severity === 'error' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  <div>
                    <span className="font-medium text-gray-900">{String(issueObj.field ?? '')}</span>
                    <span className="ml-2 text-gray-600">{String(issueObj.message ?? '')}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── Correction Audit Trail ──────────────────────────── */}
      {corrections && corrections.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="mb-2 text-sm font-semibold text-gray-700">Correction History</h4>
          <div className="space-y-2">
            {corrections.map((c: unknown, i: number) => {
              const correction = c as Record<string, unknown>;
              return (
                <div key={i} className="rounded border border-gray-100 p-2 text-sm">
                  <p className="font-medium text-gray-900">
                    Field: {String(correction.field_name)} | {String(correction.old_value ?? '—')} → {String(correction.new_value)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {String(correction.correction_reason ?? '')} — {formatTimestamp(String(correction.corrected_at))}
                    {correction.authorized ? ' ✓ Authorized' : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {issues.length === 0 && (!corrections || corrections.length === 0) && (
        <p className="py-8 text-center text-sm text-gray-400">
          No validation issues found and no corrections recorded.
        </p>
      )}
    </div>
  );
}
