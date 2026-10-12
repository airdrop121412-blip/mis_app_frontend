// ═══════════════════════════════════════════════════════════════
// useEc — TanStack Query hooks for EC operations
// ═══════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ecApi from '../api/ec';

// ── EC Queries ─────────────────────────────────────────────

export function useEc(epId: number | null) {
  return useQuery({
    queryKey: ['ec', epId],
    queryFn: () => ecApi.fetchEc(epId!),
    enabled: !!epId,
    staleTime: 30_000,
  });
}

export function useEcHistory(epId: number | null) {
  return useQuery({
    queryKey: ['ec-history', epId],
    queryFn: () => ecApi.fetchEcHistory(epId!),
    enabled: !!epId,
  });
}

// ── EC Line Items ──────────────────────────────────────────

export function useEcLineItems(epId: number | null) {
  return useQuery({
    queryKey: ['ec-line-items', epId],
    queryFn: () => ecApi.listEcLineItems(epId!),
    enabled: !!epId,
    staleTime: 30_000,
  });
}

// ── Compensations ──────────────────────────────────────────

export function useCompensations(epId: number | null) {
  return useQuery({
    queryKey: ['compensations', epId],
    queryFn: () => ecApi.listCompensations(epId!),
    enabled: !!epId,
    staleTime: 30_000,
  });
}

// ── EC Mutations ───────────────────────────────────────────

function ecInvalidation(qc: ReturnType<typeof useQueryClient>, epId: number) {
  return {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ec', epId] });
      qc.invalidateQueries({ queryKey: ['ec-line-items', epId] });
      qc.invalidateQueries({ queryKey: ['compensations', epId] });
      qc.invalidateQueries({ queryKey: ['ec-history', epId] });
      qc.invalidateQueries({ queryKey: ['ep', epId] });
    },
  };
}

export function useCreateEc(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => ecApi.createEc(epId),
    ...ecInvalidation(qc, epId),
  });
}

export function useUpdateEc(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { assessment_date?: string; remarks?: string }) =>
      ecApi.updateEc(epId, payload),
    ...ecInvalidation(qc, epId),
  });
}

export function useSubmitEc(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => ecApi.submitEc(epId),
    ...ecInvalidation(qc, epId),
  });
}

export function useVerifyEc(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => ecApi.verifyEc(epId),
    ...ecInvalidation(qc, epId),
  });
}

export function useApproveEc(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => ecApi.approveEc(epId),
    ...ecInvalidation(qc, epId),
  });
}

export function useRejectEc(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (remarks: string) => ecApi.rejectEc(epId, remarks),
    ...ecInvalidation(qc, epId),
  });
}

export function useRecalculateEc(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => ecApi.recalculateEc(epId),
    ...ecInvalidation(qc, epId),
  });
}

// ── Line Item Mutations ────────────────────────────────────

export function useCreateLineItem(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { category: string; description?: string; assessed_amount: string; remarks?: string }) =>
      ecApi.createEcLineItem(epId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ec-line-items', epId] });
      qc.invalidateQueries({ queryKey: ['ec', epId] });
    },
  });
}

export function useDeleteLineItem(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lineItemId: number) => ecApi.deleteEcLineItem(epId, lineItemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ec-line-items', epId] });
      qc.invalidateQueries({ queryKey: ['ec', epId] });
    },
  });
}

export function useUpdateLineItem(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lineItemId, payload }: {
      lineItemId: number;
      payload: { description?: string; assessed_amount: string; remarks?: string };
    }) => ecApi.updateEcLineItem(epId, lineItemId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ec-line-items', epId] });
      qc.invalidateQueries({ queryKey: ['ec', epId] });
    },
  });
}

// ── Compensation Mutations ─────────────────────────────────

export function useCreateCompensation(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { category: string; approved_amount: string; remarks?: string }) =>
      ecApi.createCompensation(epId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compensations', epId] });
      qc.invalidateQueries({ queryKey: ['ec', epId] });
    },
  });
}

export function useUpdateCompensation(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ compensationId, payload }: {
      compensationId: number;
      payload: { approved_amount?: string; remarks?: string };
    }) => ecApi.updateCompensation(epId, compensationId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compensations', epId] });
      qc.invalidateQueries({ queryKey: ['ec', epId] });
    },
  });
}

export function useDeleteCompensation(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (compensationId: number) => ecApi.deleteCompensation(epId, compensationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compensations', epId] });
      qc.invalidateQueries({ queryKey: ['ec', epId] });
    },
  });
}

export function useApproveCompensation(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (compensationId: number) => ecApi.approveCompensation(epId, compensationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compensations', epId] });
      qc.invalidateQueries({ queryKey: ['ec', epId] });
    },
  });
}

export function useCancelCompensation(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (compensationId: number) => ecApi.cancelCompensation(epId, compensationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compensations', epId] });
      qc.invalidateQueries({ queryKey: ['ec', epId] });
    },
  });
}
