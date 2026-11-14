import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAudits,
  getAudit,
  createAudit,
  classifyAudit,
  confirmWeight,
  getReviewQueue,
  verifyItem,
  markAuditVerified,
  getAnalyticsComposition,
  getAnalyticsContaminationTrend,
  getAnalyticsAudits,
} from '../api/client';
import type { AuditListParams, AnalyticsParams } from '../api/client';
import type { VerificationPayload } from '../types';

export function useAudits(params?: AuditListParams) {
  return useQuery({
    queryKey: ['audits', params],
    queryFn: () => getAudits(params),
  });
}

export function useAudit(id: number) {
  return useQuery({
    queryKey: ['audits', id],
    queryFn: () => getAudit(id),
    enabled: id > 0,
  });
}

export function useCreateAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => createAudit(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useClassifyAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (auditId: number) => classifyAudit(auditId),
    onSuccess: (_data, auditId) => {
      queryClient.invalidateQueries({ queryKey: ['audits', auditId] });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useReviewQueue() {
  return useQuery({
    queryKey: ['review-queue'],
    queryFn: getReviewQueue,
  });
}

export function useVerifyItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: number; payload: VerificationPayload }) =>
      verifyItem(itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useMarkAuditVerified() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (auditId: number) => markAuditVerified(auditId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useConfirmWeight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ auditId, weightKg }: { auditId: number; weightKg: number }) =>
      confirmWeight(auditId, weightKg),
    onSuccess: (_data, { auditId }) => {
      queryClient.invalidateQueries({ queryKey: ['audits', auditId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ── Analytics hooks ──

export function useAnalyticsComposition(params?: AnalyticsParams) {
  return useQuery({
    queryKey: ['analytics', 'composition', params],
    queryFn: () => getAnalyticsComposition(params),
  });
}

export function useAnalyticsContaminationTrend(params?: AnalyticsParams) {
  return useQuery({
    queryKey: ['analytics', 'contamination-trend', params],
    queryFn: () => getAnalyticsContaminationTrend(params),
  });
}

export function useAnalyticsAudits(params?: AnalyticsParams & { page?: number; page_size?: number }) {
  return useQuery({
    queryKey: ['analytics', 'audits', params],
    queryFn: () => getAnalyticsAudits(params),
  });
}
