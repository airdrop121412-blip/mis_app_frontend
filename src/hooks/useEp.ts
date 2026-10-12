// ═══════════════════════════════════════════════════════════════
// useEp — TanStack Query hooks for EP CRUD operations
// Phase 4B-10
// ═══════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as epApi from '../api/ep';
import type { EpListParams, InvalidEpsParams } from '../api/ep';
import type { EpCreateInput, EpUpdateInput } from '../types/ep';

// ── List EPs ─────────────────────────────────────────────────
export function useEpList(params: EpListParams) {
  return useQuery({
    queryKey: ['eps', params],
    queryFn: () => epApi.listEps(params),
    staleTime: 30_000,
  });
}

// ── Get single EP ────────────────────────────────────────────
export function useEp(id: number | null) {
  return useQuery({
    queryKey: ['ep', id],
    queryFn: () => epApi.getEp(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

// ── Create EP ────────────────────────────────────────────────
export function useCreateEp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EpCreateInput) => epApi.createEp(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eps'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

// ── Update EP ────────────────────────────────────────────────
export function useUpdateEp(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EpUpdateInput) => epApi.updateEp(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ep', id] });
      qc.invalidateQueries({ queryKey: ['eps'] });
    },
  });
}

// ── Delete EP ────────────────────────────────────────────────
export function useDeleteEp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => epApi.deleteEp(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eps'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

// ── Invalid EPs (data-quality view) ──────────────────────────
export function useInvalidEps(params: InvalidEpsParams) {
  return useQuery({
    queryKey: ['invalid-eps', params],
    queryFn: () => epApi.fetchInvalidEps(params),
    staleTime: 30_000,
  });
}

// ── Bulk delete all DRAFT EPs ─────────────────────────────────
export function useDeleteDraftEps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId?: number) => epApi.deleteDraftEps(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eps'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      qc.invalidateQueries({ queryKey: ['invalid-eps'] });
    },
  });
}

// ── Status transitions ───────────────────────────────────────
export function useSubmitEp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => epApi.submitEp(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['ep', id] });
      qc.invalidateQueries({ queryKey: ['eps'] });
    },
  });
}

export function useVerifyEp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => epApi.verifyEp(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['ep', id] });
      qc.invalidateQueries({ queryKey: ['eps'] });
    },
  });
}

export function useApproveEp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => epApi.approveEp(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['ep', id] });
      qc.invalidateQueries({ queryKey: ['eps'] });
    },
  });
}

// ── History ──────────────────────────────────────────────────
export function useEpHistory(id: number | null) {
  return useQuery({
    queryKey: ['ep-history', id],
    queryFn: () => epApi.getEpHistory(id!),
    enabled: !!id,
  });
}

// ═══════════════════════════════════════════════════════════════
// Nested entity hooks — Phase G (Entry EP + Assessment)
// ═══════════════════════════════════════════════════════════════

/** Invalidate all EP-scoped queries (list, detail, validation, file data). */
function invalidateEpQueries(qc: ReturnType<typeof useQueryClient>, epId: number) {
  qc.invalidateQueries({ queryKey: ['eps'] });
  qc.invalidateQueries({ queryKey: ['ep', epId] });
  qc.invalidateQueries({ queryKey: ['ep-validation', epId] });
  qc.invalidateQueries({ queryKey: ['ep-file-data', epId] });
  qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
}

// ── Family Members ──────────────────────────────────────────
export function useFamilyMembers(epId: number | null) {
  return useQuery({
    queryKey: ['family-members', epId],
    queryFn: () => epApi.listFamilyMembers(epId!),
    enabled: !!epId,
  });
}

export function useCreateFamilyMember(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').FamilyMember>) => epApi.createFamilyMember(epId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family-members', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useUpdateFamilyMember(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<import('../types/ep').FamilyMember> }) =>
      epApi.updateFamilyMember(epId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family-members', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useDeleteFamilyMember(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => epApi.deleteFamilyMember(epId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family-members', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

// ── Land ────────────────────────────────────────────────────
export function useLands(epId: number | null) {
  return useQuery({
    queryKey: ['lands', epId],
    queryFn: () => epApi.listLands(epId!),
    enabled: !!epId,
  });
}

export function useCreateLand(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').Land>) => epApi.createLand(epId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lands', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useUpdateLand(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<import('../types/ep').Land> }) =>
      epApi.updateLand(epId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lands', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useDeleteLand(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => epApi.deleteLand(epId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lands', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

// ── Tree ────────────────────────────────────────────────────
export function useTrees(epId: number | null) {
  return useQuery({
    queryKey: ['trees', epId],
    queryFn: () => epApi.listTrees(epId!),
    enabled: !!epId,
  });
}

export function useCreateTree(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').Tree>) => epApi.createTree(epId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trees', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useUpdateTree(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<import('../types/ep').Tree> }) =>
      epApi.updateTree(epId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trees', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useDeleteTree(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => epApi.deleteTree(epId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trees', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

// ── Infrastructure ──────────────────────────────────────────
export function useInfrastructures(epId: number | null) {
  return useQuery({
    queryKey: ['infrastructures', epId],
    queryFn: () => epApi.listInfrastructures(epId!),
    enabled: !!epId,
  });
}

export function useCreateInfrastructure(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').Infrastructure>) => epApi.createInfrastructure(epId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['infrastructures', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useUpdateInfrastructure(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<import('../types/ep').Infrastructure> }) =>
      epApi.updateInfrastructure(epId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['infrastructures', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useDeleteInfrastructure(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => epApi.deleteInfrastructure(epId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['infrastructures', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

// ── Tenant ──────────────────────────────────────────────────
export function useTenants(epId: number | null) {
  return useQuery({
    queryKey: ['tenants', epId],
    queryFn: () => epApi.listTenants(epId!),
    enabled: !!epId,
  });
}

export function useCreateTenant(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').Tenant>) => epApi.createTenant(epId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useUpdateTenant(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<import('../types/ep').Tenant> }) =>
      epApi.updateTenant(epId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useDeleteTenant(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => epApi.deleteTenant(epId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

// ── Worker ──────────────────────────────────────────────────
export function useWorkers(epId: number | null) {
  return useQuery({
    queryKey: ['workers', epId],
    queryFn: () => epApi.listWorkers(epId!),
    enabled: !!epId,
  });
}

export function useCreateWorker(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').Worker>) => epApi.createWorker(epId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workers', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useUpdateWorker(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<import('../types/ep').Worker> }) =>
      epApi.updateWorker(epId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workers', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useDeleteWorker(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => epApi.deleteWorker(epId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workers', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

// ── Business ────────────────────────────────────────────────
export function useBusinesses(epId: number | null) {
  return useQuery({
    queryKey: ['businesses', epId],
    queryFn: () => epApi.listBusinesses(epId!),
    enabled: !!epId,
  });
}

export function useCreateBusiness(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').Business>) => epApi.createBusiness(epId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useUpdateBusiness(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<import('../types/ep').Business> }) =>
      epApi.updateBusiness(epId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useDeleteBusiness(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => epApi.deleteBusiness(epId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses', epId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

// ── Crop (under Land) ───────────────────────────────────────
export function useCrops(epId: number, landId: number) {
  return useQuery({
    queryKey: ['crops', epId, landId],
    queryFn: () => epApi.listCrops(epId, landId),
  });
}

export function useCreateCrop(epId: number, landId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').Crop>) => epApi.createCrop(epId, landId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crops', epId, landId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useUpdateCrop(epId: number, landId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<import('../types/ep').Crop> }) =>
      epApi.updateCrop(epId, landId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crops', epId, landId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useDeleteCrop(epId: number, landId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => epApi.deleteCrop(epId, landId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crops', epId, landId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

// ── Assessments (1:1 with parent) ───────────────────────────

export function useLandAssessment(epId: number, landId: number) {
  return useQuery({
    queryKey: ['land-assessment', epId, landId],
    queryFn: () => epApi.getLandAssessment(epId, landId),
    retry: false,
  });
}

export function useCreateLandAssessment(epId: number, landId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').LandAssessment>) => epApi.createLandAssessment(epId, landId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['land-assessment', epId, landId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useUpdateLandAssessment(epId: number, landId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').LandAssessment>) => epApi.updateLandAssessment(epId, landId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['land-assessment', epId, landId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useDeleteLandAssessment(epId: number, landId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => epApi.deleteLandAssessment(epId, landId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['land-assessment', epId, landId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useTreeAssessment(epId: number, treeId: number) {
  return useQuery({
    queryKey: ['tree-assessment', epId, treeId],
    queryFn: () => epApi.getTreeAssessment(epId, treeId),
    retry: false,
  });
}

export function useCreateTreeAssessment(epId: number, treeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').TreeAssessment>) => epApi.createTreeAssessment(epId, treeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tree-assessment', epId, treeId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useUpdateTreeAssessment(epId: number, treeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').TreeAssessment>) => epApi.updateTreeAssessment(epId, treeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tree-assessment', epId, treeId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useDeleteTreeAssessment(epId: number, treeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => epApi.deleteTreeAssessment(epId, treeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tree-assessment', epId, treeId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useInfrastructureAssessment(epId: number, infraId: number) {
  return useQuery({
    queryKey: ['infrastructure-assessment', epId, infraId],
    queryFn: () => epApi.getInfrastructureAssessment(epId, infraId),
    retry: false,
  });
}

export function useCreateInfrastructureAssessment(epId: number, infraId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').InfrastructureAssessment>) => epApi.createInfrastructureAssessment(epId, infraId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['infrastructure-assessment', epId, infraId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useUpdateInfrastructureAssessment(epId: number, infraId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').InfrastructureAssessment>) => epApi.updateInfrastructureAssessment(epId, infraId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['infrastructure-assessment', epId, infraId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useDeleteInfrastructureAssessment(epId: number, infraId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => epApi.deleteInfrastructureAssessment(epId, infraId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['infrastructure-assessment', epId, infraId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useCropAssessment(epId: number, landId: number, cropId: number) {
  return useQuery({
    queryKey: ['crop-assessment', epId, landId, cropId],
    queryFn: () => epApi.getCropAssessment(epId, landId, cropId),
    retry: false,
  });
}

export function useCreateCropAssessment(epId: number, landId: number, cropId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').CropAssessment>) => epApi.createCropAssessment(epId, landId, cropId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crop-assessment', epId, landId, cropId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useUpdateCropAssessment(epId: number, landId: number, cropId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').CropAssessment>) => epApi.updateCropAssessment(epId, landId, cropId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crop-assessment', epId, landId, cropId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useDeleteCropAssessment(epId: number, landId: number, cropId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => epApi.deleteCropAssessment(epId, landId, cropId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crop-assessment', epId, landId, cropId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useWorkerAssessment(epId: number, workerId: number) {
  return useQuery({
    queryKey: ['worker-assessment', epId, workerId],
    queryFn: () => epApi.getWorkerAssessment(epId, workerId),
    retry: false,
  });
}

export function useCreateWorkerAssessment(epId: number, workerId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').WorkerAssessment>) => epApi.createWorkerAssessment(epId, workerId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worker-assessment', epId, workerId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useUpdateWorkerAssessment(epId: number, workerId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').WorkerAssessment>) => epApi.updateWorkerAssessment(epId, workerId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worker-assessment', epId, workerId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useDeleteWorkerAssessment(epId: number, workerId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => epApi.deleteWorkerAssessment(epId, workerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worker-assessment', epId, workerId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

// ── Business Loss (1:1 with Business) ───────────────────────
export function useBusinessLoss(epId: number, businessId: number) {
  return useQuery({
    queryKey: ['business-loss', epId, businessId],
    queryFn: () => epApi.getBusinessLoss(epId, businessId),
    retry: false,
  });
}

export function useCreateBusinessLoss(epId: number, businessId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').BusinessLoss>) => epApi.createBusinessLoss(epId, businessId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-loss', epId, businessId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useUpdateBusinessLoss(epId: number, businessId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/ep').BusinessLoss>) => epApi.updateBusinessLoss(epId, businessId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-loss', epId, businessId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

export function useDeleteBusinessLoss(epId: number, businessId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => epApi.deleteBusinessLoss(epId, businessId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-loss', epId, businessId] });
      invalidateEpQueries(qc, epId);
    },
  });
}

// ── Rates (assessment dropdowns) ────────────────────────────
export function useRates(type: 'land' | 'tree' | 'infrastructure' | 'crop', params: Record<string, number> = {}) {
  return useQuery({
    queryKey: ['rates', type, params],
    queryFn: () => epApi.fetchRates(type, params),
    staleTime: 5 * 60_000,
  });
}
