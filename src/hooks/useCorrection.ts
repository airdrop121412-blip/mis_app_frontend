// ═══════════════════════════════════════════════════════════════
// useCorrection — TanStack Query hooks for data corrections
// Phase F
// ═══════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCorrections,
  createCorrection,
  fetchCorrectionHistory,
  listCorrectionEps,
  listCorrectionHistory,
  deleteCorrectionEp,
} from '../api/correctionAudit';
import { correctionUpdateEp } from '../api/ep';
import type { CorrectionCreateRequest } from '../types/validation';
import type { EpUpdateInput } from '../types/ep';

// ── List corrections ────────────────────────────────────────
export function useCorrections(
  projectId: number | null,
  params: { entity_type?: string; q?: string; per_page?: number } = {}
) {
  return useQuery({
    queryKey: ['corrections', projectId, params],
    queryFn: () => fetchCorrections(projectId!, params),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

// ── Apply a correction ──────────────────────────────────────
export function useCreateCorrection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (request: CorrectionCreateRequest) => createCorrection(request),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corrections'] });
    },
  });
}

// ── Correction history for an entity ────────────────────────
export function useCorrectionHistory(entityType: string | null, entityId: number | null) {
  return useQuery({
    queryKey: ['correction-history', entityType, entityId],
    queryFn: () => fetchCorrectionHistory(entityType!, entityId!),
    enabled: !!entityType && !!entityId,
    staleTime: 30_000,
  });
}

// ── Admin correction: APPROVED EPs available for correction ─
export function useCorrectionEps(params: {
  project_id?: number;
  q?: string;
  district_id?: number;
  upazila_id?: number;
  page?: number;
  per_page?: number;
}) {
  return useQuery({
    queryKey: ['correction-eps', params],
    queryFn: () => listCorrectionEps(params),
    enabled: !!params.project_id,
    staleTime: 30_000,
  });
}

// ── Admin correction: project-wide correction history ───────
export function useCorrectionHistoryList(params: {
  project_id?: number;
  entity_type?: string;
  change_type?: string;
  q?: string;
  page?: number;
  per_page?: number;
}) {
  return useQuery({
    queryKey: ['correction-history-list', params],
    queryFn: () => listCorrectionHistory(params),
    enabled: !!params.project_id,
    staleTime: 15_000,
  });
}

// ── Admin correction: delete an APPROVED EP (reason required) 
export function useDeleteCorrectionEp() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ affectedPersonId, reason }: { affectedPersonId: number; reason: string }) =>
      deleteCorrectionEp(affectedPersonId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['correction-eps'] });
      qc.invalidateQueries({ queryKey: ['correction-history-list'] });
      qc.invalidateQueries({ queryKey: ['corrections'] });
      qc.invalidateQueries({ queryKey: ['eps'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

// ── Admin correction: save an APPROVED EP edit (reason required)
export function useCorrectionUpdateEp(epId: number, reason: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: EpUpdateInput) => correctionUpdateEp(epId, data, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ep', epId] });
      qc.invalidateQueries({ queryKey: ['eps'] });
      qc.invalidateQueries({ queryKey: ['corrections'] });
      qc.invalidateQueries({ queryKey: ['correction-eps'] });
      qc.invalidateQueries({ queryKey: ['correction-history-list'] });
    },
  });
}