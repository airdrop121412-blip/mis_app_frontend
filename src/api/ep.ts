// ═══════════════════════════════════════════════════════════════
// EP API — CRUD for Affected Persons + nested entities
// Source: backend routes/api/v1.php (ep section)
// All responses follow the ApiResponse envelope.
// ═══════════════════════════════════════════════════════════════

import apiClient from './client';
import type { ApiResponse } from '../types/api';
import type {
  AffectedPerson,
  EpCreateInput,
  EpUpdateInput,
  FamilyMember,
  Land,
  Tree,
  Infrastructure,
  Tenant,
  Worker,
  Business,
  Crop,
  LandAssessment,
  TreeAssessment,
  InfrastructureAssessment,
  CropAssessment,
  WorkerAssessment,
  BusinessLoss,
  RateItem,
  StatusHistoryEntry,
  MasterItem,
} from '../types/ep';

// ── Helpers ──────────────────────────────────────────────────

function unwrap<T>(response: { data: ApiResponse<T> }): T {
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Request failed');
  }
  return body.data;
}

function unwrapList<T>(response: { data: ApiResponse<T[]> }): { items: T[]; pagination: Record<string, number> } {
  const body = response.data;
  if (!body.success) {
    throw new Error(body.message ?? 'Request failed');
  }
  return {
    items: body.data ?? [],
    pagination: (body.meta as Record<string, Record<string, number>>)?.pagination ?? {},
  };
}

// ── EP CRUD ──────────────────────────────────────────────────

export interface EpListParams {
  project_id?: number;
  district_id?: number;
  upazila_id?: number;
  status?: string;
  q?: string;
  per_page?: number;
  page?: number;
}

/** GET /api/v1/ep — list EPs with filters */
export async function listEps(params: EpListParams = {}) {
  const response = await apiClient.get<ApiResponse<AffectedPerson[]>>('/ep', { params });
  return unwrapList(response);
}

/** GET /api/v1/ep/lookup?q= — lookup EP by EP ID code / id / name (scoped to the active project) */
export async function lookupEps(q: string, limit = 20, projectId?: number): Promise<AffectedPerson[]> {
  const response = await apiClient.get<ApiResponse<AffectedPerson[]>>('/ep/lookup', {
    params: { q, limit, project_id: projectId },
  });
  return unwrapList(response).items;
}

/** POST /api/v1/ep — create EP (server generates ep_id, status=DRAFT) */
export async function createEp(data: EpCreateInput): Promise<AffectedPerson> {
  const response = await apiClient.post<ApiResponse<AffectedPerson>>('/ep', data);
  return unwrap(response);
}

/** GET /api/v1/ep/{id} — get EP with relationships */
export async function getEp(id: number): Promise<AffectedPerson> {
  const response = await apiClient.get<ApiResponse<AffectedPerson>>(`/ep/${id}`);
  return unwrap(response);
}

/** PUT /api/v1/ep/{id} — update EP (only DRAFT) */
export async function updateEp(id: number, data: EpUpdateInput): Promise<AffectedPerson> {
  const response = await apiClient.put<ApiResponse<AffectedPerson>>(`/ep/${id}`, data);
  return unwrap(response);
}

/**
 * PUT /api/v1/ep/{id} in admin-correction mode.
 *
 * An APPROVED EP is locked; the backend only writes it when a correction
 * reason is supplied, and it stores the reason plus every changed field in
 * correction_audit so the Correction History screen can show WHY it changed.
 */
export async function correctionUpdateEp(
  id: number,
  data: EpUpdateInput,
  correctionReason: string,
): Promise<AffectedPerson> {
  const response = await apiClient.put<ApiResponse<AffectedPerson>>(`/ep/${id}`, {
    ...data,
    correction_reason: correctionReason,
  });
  return unwrap(response);
}

/** DELETE /api/v1/ep/{id} — delete EP (only DRAFT) */
export async function deleteEp(id: number): Promise<void> {
  await apiClient.delete(`/ep/${id}`);
}

// ── Invalid EPs & Validation ────────────────────────────────────

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface InvalidEp {
  ep_id: number;
  ep_id_code: string | null;
  name: string | null;
  issues: ValidationIssue[];
}

export interface InvalidEpsParams {
  project_id?: number;
  per_page?: number;
  page?: number;
}

export interface InvalidEpsResponse {
  items: InvalidEp[];
  pagination: Record<string, number>;
}

/** GET /api/v1/validation/eps/invalid — paginated list of EPs with NID/Mobile issues */
export async function fetchInvalidEps(params: InvalidEpsParams = {}): Promise<InvalidEpsResponse> {
  const response = await apiClient.get<ApiResponse<InvalidEp[]>>(
    '/validation/eps/invalid',
    { params: buildParams(params) },
  );
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Failed to fetch invalid EPs');
  }
  return {
    items: body.data,
    pagination: (body.meta as Record<string, Record<string, number>>)?.pagination ?? {},
  };
}

function buildParams(filters: InvalidEpsParams): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params[key] = String(value);
    }
  }
  return params;
}

/** DELETE /api/v1/ep/draft — bulk delete all DRAFT EPs (optional project_id) */
export async function deleteDraftEps(projectId?: number): Promise<{ deleted: number }> {
  const params: Record<string, string> = {};
  if (projectId) params.project_id = String(projectId);
  const response = await apiClient.delete<ApiResponse<{ deleted: number }>>(
    '/ep/draft',
    { params },
  );
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Failed to delete draft EPs');
  }
  return body.data;
}


// ── EP Status Transitions ────────────────────────────────────

export async function submitEp(id: number): Promise<AffectedPerson> {
  const response = await apiClient.post<ApiResponse<AffectedPerson>>(`/ep/${id}/submit`);
  return unwrap(response);
}

export async function verifyEp(id: number): Promise<AffectedPerson> {
  const response = await apiClient.post<ApiResponse<AffectedPerson>>(`/ep/${id}/verify`);
  return unwrap(response);
}

export async function approveEp(id: number): Promise<AffectedPerson> {
  const response = await apiClient.post<ApiResponse<AffectedPerson>>(`/ep/${id}/approve`);
  return unwrap(response);
}

/** GET /api/v1/ep/{id}/history */
export async function getEpHistory(id: number): Promise<StatusHistoryEntry[]> {
  const response = await apiClient.get<ApiResponse<StatusHistoryEntry[]>>(`/ep/${id}/history`);
  return unwrap(response);
}

// ── Nested: Family Members ───────────────────────────────────

export async function listFamilyMembers(epId: number) {
  const response = await apiClient.get<ApiResponse<FamilyMember[]>>(`/ep/${epId}/family-member`, { params: { per_page: 100 } });
  return unwrapList(response);
}

export async function createFamilyMember(epId: number, data: Partial<FamilyMember>): Promise<FamilyMember> {
  const response = await apiClient.post<ApiResponse<FamilyMember>>(`/ep/${epId}/family-member`, data);
  return unwrap(response);
}

export async function updateFamilyMember(epId: number, id: number, data: Partial<FamilyMember>): Promise<FamilyMember> {
  const response = await apiClient.put<ApiResponse<FamilyMember>>(`/ep/${epId}/family-member/${id}`, data);
  return unwrap(response);
}

export async function deleteFamilyMember(epId: number, id: number): Promise<void> {
  await apiClient.delete(`/ep/${epId}/family-member/${id}`);
}

export async function getFamilyMember(epId: number, id: number): Promise<FamilyMember> {
  const response = await apiClient.get<ApiResponse<FamilyMember>>(`/ep/${epId}/family-member/${id}`);
  return unwrap(response);
}

// ── Nested: Land ─────────────────────────────────────────────

export async function listLands(epId: number) {
  const response = await apiClient.get<ApiResponse<Land[]>>(`/ep/${epId}/land`, { params: { per_page: 100 } });
  return unwrapList(response);
}

export async function createLand(epId: number, data: Partial<Land>): Promise<Land> {
  const response = await apiClient.post<ApiResponse<Land>>(`/ep/${epId}/land`, data);
  return unwrap(response);
}

export async function updateLand(epId: number, id: number, data: Partial<Land>): Promise<Land> {
  const response = await apiClient.put<ApiResponse<Land>>(`/ep/${epId}/land/${id}`, data);
  return unwrap(response);
}

export async function deleteLand(epId: number, id: number): Promise<void> {
  await apiClient.delete(`/ep/${epId}/land/${id}`);
}

export async function getLand(epId: number, id: number): Promise<Land> {
  const response = await apiClient.get<ApiResponse<Land>>(`/ep/${epId}/land/${id}`);
  return unwrap(response);
}

// ── Nested: Tree ─────────────────────────────────────────────

export async function listTrees(epId: number) {
  const response = await apiClient.get<ApiResponse<Tree[]>>(`/ep/${epId}/tree`, { params: { per_page: 100 } });
  return unwrapList(response);
}

export async function createTree(epId: number, data: Partial<Tree>): Promise<Tree> {
  const response = await apiClient.post<ApiResponse<Tree>>(`/ep/${epId}/tree`, data);
  return unwrap(response);
}

export async function updateTree(epId: number, id: number, data: Partial<Tree>): Promise<Tree> {
  const response = await apiClient.put<ApiResponse<Tree>>(`/ep/${epId}/tree/${id}`, data);
  return unwrap(response);
}

export async function deleteTree(epId: number, id: number): Promise<void> {
  await apiClient.delete(`/ep/${epId}/tree/${id}`);
}

export async function getTree(epId: number, id: number): Promise<Tree> {
  const response = await apiClient.get<ApiResponse<Tree>>(`/ep/${epId}/tree/${id}`);
  return unwrap(response);
}

// ── Nested: Infrastructure ───────────────────────────────────

export async function listInfrastructures(epId: number) {
  const response = await apiClient.get<ApiResponse<Infrastructure[]>>(`/ep/${epId}/infrastructure`, { params: { per_page: 100 } });
  return unwrapList(response);
}

export async function createInfrastructure(epId: number, data: Partial<Infrastructure>): Promise<Infrastructure> {
  const response = await apiClient.post<ApiResponse<Infrastructure>>(`/ep/${epId}/infrastructure`, data);
  return unwrap(response);
}

export async function updateInfrastructure(epId: number, id: number, data: Partial<Infrastructure>): Promise<Infrastructure> {
  const response = await apiClient.put<ApiResponse<Infrastructure>>(`/ep/${epId}/infrastructure/${id}`, data);
  return unwrap(response);
}

export async function deleteInfrastructure(epId: number, id: number): Promise<void> {
  await apiClient.delete(`/ep/${epId}/infrastructure/${id}`);
}

export async function getInfrastructure(epId: number, id: number): Promise<Infrastructure> {
  const response = await apiClient.get<ApiResponse<Infrastructure>>(`/ep/${epId}/infrastructure/${id}`);
  return unwrap(response);
}

// ── Nested: Tenant ───────────────────────────────────────────

export async function listTenants(epId: number) {
  const response = await apiClient.get<ApiResponse<Tenant[]>>(`/ep/${epId}/tenant`, { params: { per_page: 100 } });
  return unwrapList(response);
}

export async function createTenant(epId: number, data: Partial<Tenant>): Promise<Tenant> {
  const response = await apiClient.post<ApiResponse<Tenant>>(`/ep/${epId}/tenant`, data);
  return unwrap(response);
}

export async function updateTenant(epId: number, id: number, data: Partial<Tenant>): Promise<Tenant> {
  const response = await apiClient.put<ApiResponse<Tenant>>(`/ep/${epId}/tenant/${id}`, data);
  return unwrap(response);
}

export async function deleteTenant(epId: number, id: number): Promise<void> {
  await apiClient.delete(`/ep/${epId}/tenant/${id}`);
}

export async function getTenant(epId: number, id: number): Promise<Tenant> {
  const response = await apiClient.get<ApiResponse<Tenant>>(`/ep/${epId}/tenant/${id}`);
  return unwrap(response);
}

// ── Nested: Worker ───────────────────────────────────────────

export async function listWorkers(epId: number) {
  const response = await apiClient.get<ApiResponse<Worker[]>>(`/ep/${epId}/worker`, { params: { per_page: 100 } });
  return unwrapList(response);
}

export async function createWorker(epId: number, data: Partial<Worker>): Promise<Worker> {
  const response = await apiClient.post<ApiResponse<Worker>>(`/ep/${epId}/worker`, data);
  return unwrap(response);
}

export async function updateWorker(epId: number, id: number, data: Partial<Worker>): Promise<Worker> {
  const response = await apiClient.put<ApiResponse<Worker>>(`/ep/${epId}/worker/${id}`, data);
  return unwrap(response);
}

export async function deleteWorker(epId: number, id: number): Promise<void> {
  await apiClient.delete(`/ep/${epId}/worker/${id}`);
}

export async function getWorker(epId: number, id: number): Promise<Worker> {
  const response = await apiClient.get<ApiResponse<Worker>>(`/ep/${epId}/worker/${id}`);
  return unwrap(response);
}

// ── Nested: Business ────────────────────────────────────────

export async function listBusinesses(epId: number) {
  const response = await apiClient.get<ApiResponse<Business[]>>(`/ep/${epId}/business`, { params: { per_page: 100 } });
  return unwrapList(response);
}

export async function createBusiness(epId: number, data: Partial<Business>): Promise<Business> {
  const response = await apiClient.post<ApiResponse<Business>>(`/ep/${epId}/business`, data);
  return unwrap(response);
}

export async function updateBusiness(epId: number, id: number, data: Partial<Business>): Promise<Business> {
  const response = await apiClient.put<ApiResponse<Business>>(`/ep/${epId}/business/${id}`, data);
  return unwrap(response);
}

export async function deleteBusiness(epId: number, id: number): Promise<void> {
  await apiClient.delete(`/ep/${epId}/business/${id}`);
}

export async function getBusiness(epId: number, id: number): Promise<Business> {
  const response = await apiClient.get<ApiResponse<Business>>(`/ep/${epId}/business/${id}`);
  return unwrap(response);
}

// ── Nested: Crop (under Land) ───────────────────────────────

export async function listCrops(epId: number, landId: number) {
  const response = await apiClient.get<ApiResponse<Crop[]>>(`/ep/${epId}/land/${landId}/crop`, { params: { per_page: 100 } });
  return unwrapList(response);
}

export async function createCrop(epId: number, landId: number, data: Partial<Crop>): Promise<Crop> {
  const response = await apiClient.post<ApiResponse<Crop>>(`/ep/${epId}/land/${landId}/crop`, data);
  return unwrap(response);
}

export async function updateCrop(epId: number, landId: number, id: number, data: Partial<Crop>): Promise<Crop> {
  const response = await apiClient.put<ApiResponse<Crop>>(`/ep/${epId}/land/${landId}/crop/${id}`, data);
  return unwrap(response);
}

export async function deleteCrop(epId: number, landId: number, id: number): Promise<void> {
  await apiClient.delete(`/ep/${epId}/land/${landId}/crop/${id}`);
}

export async function getCrop(epId: number, landId: number, id: number): Promise<Crop> {
  const response = await apiClient.get<ApiResponse<Crop>>(`/ep/${epId}/land/${landId}/crop/${id}`);
  return unwrap(response);
}

// ── Assessments (1:1 with parent) ───────────────────────────

// Land assessment
export async function getLandAssessment(epId: number, landId: number): Promise<LandAssessment> {
  const response = await apiClient.get<ApiResponse<LandAssessment>>(`/ep/${epId}/land/${landId}/assessment`);
  return unwrap(response);
}

export async function createLandAssessment(epId: number, landId: number, data: Partial<LandAssessment>): Promise<LandAssessment> {
  const response = await apiClient.post<ApiResponse<LandAssessment>>(`/ep/${epId}/land/${landId}/assessment`, data);
  return unwrap(response);
}

export async function updateLandAssessment(epId: number, landId: number, data: Partial<LandAssessment>): Promise<LandAssessment> {
  const response = await apiClient.put<ApiResponse<LandAssessment>>(`/ep/${epId}/land/${landId}/assessment`, data);
  return unwrap(response);
}

export async function deleteLandAssessment(epId: number, landId: number): Promise<void> {
  await apiClient.delete(`/ep/${epId}/land/${landId}/assessment`);
}

// Tree assessment
export async function getTreeAssessment(epId: number, treeId: number): Promise<TreeAssessment> {
  const response = await apiClient.get<ApiResponse<TreeAssessment>>(`/ep/${epId}/tree/${treeId}/assessment`);
  return unwrap(response);
}

export async function createTreeAssessment(epId: number, treeId: number, data: Partial<TreeAssessment>): Promise<TreeAssessment> {
  const response = await apiClient.post<ApiResponse<TreeAssessment>>(`/ep/${epId}/tree/${treeId}/assessment`, data);
  return unwrap(response);
}

export async function updateTreeAssessment(epId: number, treeId: number, data: Partial<TreeAssessment>): Promise<TreeAssessment> {
  const response = await apiClient.put<ApiResponse<TreeAssessment>>(`/ep/${epId}/tree/${treeId}/assessment`, data);
  return unwrap(response);
}

export async function deleteTreeAssessment(epId: number, treeId: number): Promise<void> {
  await apiClient.delete(`/ep/${epId}/tree/${treeId}/assessment`);
}

// Infrastructure assessment
export async function getInfrastructureAssessment(epId: number, infraId: number): Promise<InfrastructureAssessment> {
  const response = await apiClient.get<ApiResponse<InfrastructureAssessment>>(`/ep/${epId}/infrastructure/${infraId}/assessment`);
  return unwrap(response);
}

export async function createInfrastructureAssessment(epId: number, infraId: number, data: Partial<InfrastructureAssessment>): Promise<InfrastructureAssessment> {
  const response = await apiClient.post<ApiResponse<InfrastructureAssessment>>(`/ep/${epId}/infrastructure/${infraId}/assessment`, data);
  return unwrap(response);
}

export async function updateInfrastructureAssessment(epId: number, infraId: number, data: Partial<InfrastructureAssessment>): Promise<InfrastructureAssessment> {
  const response = await apiClient.put<ApiResponse<InfrastructureAssessment>>(`/ep/${epId}/infrastructure/${infraId}/assessment`, data);
  return unwrap(response);
}

export async function deleteInfrastructureAssessment(epId: number, infraId: number): Promise<void> {
  await apiClient.delete(`/ep/${epId}/infrastructure/${infraId}/assessment`);
}

// Crop assessment
export async function getCropAssessment(epId: number, landId: number, cropId: number): Promise<CropAssessment> {
  const response = await apiClient.get<ApiResponse<CropAssessment>>(`/ep/${epId}/land/${landId}/crop/${cropId}/assessment`);
  return unwrap(response);
}

export async function createCropAssessment(epId: number, landId: number, cropId: number, data: Partial<CropAssessment>): Promise<CropAssessment> {
  const response = await apiClient.post<ApiResponse<CropAssessment>>(`/ep/${epId}/land/${landId}/crop/${cropId}/assessment`, data);
  return unwrap(response);
}

export async function updateCropAssessment(epId: number, landId: number, cropId: number, data: Partial<CropAssessment>): Promise<CropAssessment> {
  const response = await apiClient.put<ApiResponse<CropAssessment>>(`/ep/${epId}/land/${landId}/crop/${cropId}/assessment`, data);
  return unwrap(response);
}

export async function deleteCropAssessment(epId: number, landId: number, cropId: number): Promise<void> {
  await apiClient.delete(`/ep/${epId}/land/${landId}/crop/${cropId}/assessment`);
}

// Worker assessment
export async function getWorkerAssessment(epId: number, workerId: number): Promise<WorkerAssessment> {
  const response = await apiClient.get<ApiResponse<WorkerAssessment>>(`/ep/${epId}/worker/${workerId}/assessment`);
  return unwrap(response);
}

export async function createWorkerAssessment(epId: number, workerId: number, data: Partial<WorkerAssessment>): Promise<WorkerAssessment> {
  const response = await apiClient.post<ApiResponse<WorkerAssessment>>(`/ep/${epId}/worker/${workerId}/assessment`, data);
  return unwrap(response);
}

export async function updateWorkerAssessment(epId: number, workerId: number, data: Partial<WorkerAssessment>): Promise<WorkerAssessment> {
  const response = await apiClient.put<ApiResponse<WorkerAssessment>>(`/ep/${epId}/worker/${workerId}/assessment`, data);
  return unwrap(response);
}

export async function deleteWorkerAssessment(epId: number, workerId: number): Promise<void> {
  await apiClient.delete(`/ep/${epId}/worker/${workerId}/assessment`);
}

// Business loss (1:1 with Business)
export async function getBusinessLoss(epId: number, businessId: number): Promise<BusinessLoss> {
  const response = await apiClient.get<ApiResponse<BusinessLoss>>(`/ep/${epId}/business/${businessId}/loss`);
  return unwrap(response);
}

export async function createBusinessLoss(epId: number, businessId: number, data: Partial<BusinessLoss>): Promise<BusinessLoss> {
  const response = await apiClient.post<ApiResponse<BusinessLoss>>(`/ep/${epId}/business/${businessId}/loss`, data);
  return unwrap(response);
}

export async function updateBusinessLoss(epId: number, businessId: number, data: Partial<BusinessLoss>): Promise<BusinessLoss> {
  const response = await apiClient.put<ApiResponse<BusinessLoss>>(`/ep/${epId}/business/${businessId}/loss`, data);
  return unwrap(response);
}

export async function deleteBusinessLoss(epId: number, businessId: number): Promise<void> {
  await apiClient.delete(`/ep/${epId}/business/${businessId}/loss`);
}

// ── Rate lookup (assessment dropdowns) ──────────────────────

/** GET /api/v1/rates/{type} — active rates for land/tree/infrastructure/crop */
export async function fetchRates(type: 'land' | 'tree' | 'infrastructure' | 'crop', params: Record<string, number> = {}): Promise<RateItem[]> {
  const response = await apiClient.get<ApiResponse<RateItem[]>>(`/rates/${type}`, { params });
  return unwrap(response);
}

// ── File Data (document generation) ───────────────────────

export async function fetchEpFileData(epId: number) {
  const response = await apiClient.get<ApiResponse<Record<string, unknown>>>(`/ep/${epId}/file-data`);
  return unwrap(response);
}

// ── Master data (for dropdowns) ──────────────────────────────

export async function fetchMaster(entity: string, params: Record<string, string> = {}): Promise<MasterItem[]> {
  const response = await apiClient.get<ApiResponse<MasterItem[]>>(`/masters/${entity}`, { params });
  return unwrap(response);
}

export async function fetchUpazilasByDistrict(districtId: number): Promise<MasterItem[]> {
  const response = await apiClient.get<ApiResponse<MasterItem[]>>('/masters/upazilas', {
    params: { district_id: districtId },
  });
  return unwrap(response);
}

export async function fetchVillagesByUpazila(upazilaId: number): Promise<MasterItem[]> {
  const response = await apiClient.get<ApiResponse<MasterItem[]>>('/masters/villages', {
    params: { upazila_id: upazilaId },
  });
  return unwrap(response);
}
