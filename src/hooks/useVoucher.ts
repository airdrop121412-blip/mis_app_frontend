// ═══════════════════════════════════════════════════════════════
// useVoucher — TanStack Query hooks for Voucher + Payment operations
// ═══════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listVouchers,
  fetchVoucher,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  verifyVoucher,
  approveVoucher,
  cancelVoucher,
  attachCompensation,
  listPayments,
  recordPayment,
  voidPayment,
  fetchPaymentMethods,
} from '../api/voucher';
import type { Voucher } from '../types/voucher';

// ── List vouchers for an EP ─────────────────────────────────
export function useVouchers(epId: number | null) {
  return useQuery({
    queryKey: ['vouchers', epId],
    queryFn: () => listVouchers(epId!),
    enabled: !!epId,
    staleTime: 30_000,
  });
}

// ── Fetch single voucher (full data) ────────────────────────
export function useVoucher(epId: number | null, voucherId: number | null) {
  return useQuery({
    queryKey: ['voucher', epId, voucherId],
    queryFn: () => fetchVoucher(epId!, voucherId!),
    enabled: !!epId && !!voucherId,
    staleTime: 30_000,
  });
}

// ── Create voucher ──────────────────────────────────────────
export function useCreateVoucher(epId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => createVoucher(epId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vouchers', epId] });
      qc.invalidateQueries({ queryKey: ['voucher-file-list', epId] });
      qc.invalidateQueries({ queryKey: ['ep', epId] });
    },
  });
}

// ── Update voucher ──────────────────────────────────────────
export function useUpdateVoucher(epId: number, voucherId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { voucher_date?: string; remarks?: string }) =>
      updateVoucher(epId, voucherId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['voucher', epId, voucherId] });
      qc.invalidateQueries({ queryKey: ['vouchers', epId] });
      qc.invalidateQueries({ queryKey: ['ep', epId] });
      qc.invalidateQueries({ queryKey: ['eps'] });
      qc.invalidateQueries({ queryKey: ['payment-register'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

// ── Delete voucher ──────────────────────────────────────────
export function useDeleteVoucher(epId: number, voucherId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteVoucher(epId, voucherId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vouchers', epId] });
      qc.invalidateQueries({ queryKey: ['ep', epId] });
    },
  });
}

// ── Verify voucher ──────────────────────────────────────────
export function useVerifyVoucher(epId: number, voucherId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => verifyVoucher(epId, voucherId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['voucher', epId, voucherId] });
      qc.invalidateQueries({ queryKey: ['vouchers', epId] });
    },
  });
}

// ── Approve voucher ─────────────────────────────────────────
export function useApproveVoucher(epId: number, voucherId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentDate?: string) => approveVoucher(epId, voucherId, paymentDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['voucher', epId, voucherId] });
      qc.invalidateQueries({ queryKey: ['vouchers', epId] });
    },
  });
}

// ── Cancel voucher ──────────────────────────────────────────
export function useCancelVoucher(epId: number, voucherId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cancelVoucher(epId, voucherId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['voucher', epId, voucherId] });
      qc.invalidateQueries({ queryKey: ['vouchers', epId] });
    },
  });
}

// ── Attach compensation to voucher ──────────────────────────
export function useAttachCompensation(epId: number, voucherId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (compensationId: number) => attachCompensation(epId, voucherId, compensationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['voucher', epId, voucherId] });
      qc.invalidateQueries({ queryKey: ['vouchers', epId] });
    },
  });
}

// ── Payments ────────────────────────────────────────────────
export function usePayments(epId: number | null, voucherId: number | null) {
  return useQuery({
    queryKey: ['payments', epId, voucherId],
    queryFn: () => listPayments(epId!, voucherId!),
    enabled: !!epId && !!voucherId,
    staleTime: 30_000,
  });
}

export function useRecordPayment(epId: number, voucherId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof recordPayment>[2]) =>
      recordPayment(epId, voucherId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', epId, voucherId] });
      qc.invalidateQueries({ queryKey: ['voucher', epId, voucherId] });
      qc.invalidateQueries({ queryKey: ['vouchers', epId] });
    },
  });
}

export function useVoidPayment(epId: number, voucherId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: number) => voidPayment(epId, voucherId, paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', epId, voucherId] });
      qc.invalidateQueries({ queryKey: ['voucher', epId, voucherId] });
      qc.invalidateQueries({ queryKey: ['vouchers', epId] });
    },
  });
}

// ── Payment methods master ──────────────────────────────────
export function usePaymentMethods() {
  return useQuery({
    queryKey: ['master', 'payment-method'],
    queryFn: fetchPaymentMethods,
    staleTime: 5 * 60_000,
  });
}

// ── Helper: compute payment summary from a voucher ──────────
export function paymentSummary(voucher: Voucher, payments: Array<{ amount: string }> | undefined) {
  const approved = parseFloat(voucher.approved_amount) || 0;
  const paid = (payments ?? []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  return {
    approved,
    paid,
    remaining: approved - paid,
  };
}