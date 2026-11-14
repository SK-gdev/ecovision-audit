import axios from 'axios';
import type {
  Bin,
  BinCreate,
  BinUpdate,
  Audit,
  AIPrediction,
  DashboardStats,
  MonthlyTrend,
  WasteComposition,
  ContaminationHotspot,
  RecentAudit,
  DetectedItem,
  ReviewQueueItem,
  VerificationPayload,
  ContaminationTrendPoint,
  PaginatedAuditHistory,
} from '../types';

export const API_BASE_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) || ''
).replace(/\/$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Helper for photo URL
export function getPhotoUrl(photoPath: string): string {
  if (!photoPath) return '';
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
    return photoPath;
  }
  const cleanPath = photoPath.startsWith('/') ? photoPath.slice(1) : photoPath;
  return `${API_BASE_URL}/${cleanPath}`;
}

// ── Dashboard ──

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/api/dashboard/stats');
  return data;
}

export async function getRecentAudits(): Promise<RecentAudit[]> {
  const { data } = await api.get<RecentAudit[]>('/api/dashboard/recent-audits');
  return data;
}

export async function getContaminationHotspots(): Promise<ContaminationHotspot[]> {
  const { data } = await api.get<ContaminationHotspot[]>('/api/dashboard/contamination-hotspots');
  return data;
}

export async function getMonthlyTrends(): Promise<MonthlyTrend[]> {
  const { data } = await api.get<MonthlyTrend[]>('/api/dashboard/monthly-trends');
  return data;
}

export async function getWasteComposition(): Promise<WasteComposition[]> {
  const { data } = await api.get<WasteComposition[]>('/api/dashboard/waste-composition');
  return data;
}

// ── Bins ──

export async function getBins(): Promise<Bin[]> {
  const { data } = await api.get<Bin[]>('/api/bins');
  return data;
}

export async function getBin(id: number): Promise<Bin> {
  const { data } = await api.get<Bin>(`/api/bins/${id}`);
  return data;
}

export async function createBin(bin: BinCreate): Promise<Bin> {
  const { data } = await api.post<Bin>('/api/bins', bin);
  return data;
}

export async function updateBin(id: number, bin: BinUpdate): Promise<Bin> {
  const { data } = await api.put<Bin>(`/api/bins/${id}`, bin);
  return data;
}

export async function deleteBin(id: number): Promise<void> {
  await api.delete(`/api/bins/${id}`);
}

export async function getBinByQr(qrCode: string): Promise<Bin> {
  const { data } = await api.get<Bin>(`/api/bins/${qrCode}/by-qr`);
  return data;
}

export function getBinQrImageUrl(id: number): string {
  return `${API_BASE_URL}/api/bins/${id}/qr-image`;
}

// ── Audits ──

export interface AuditListParams {
  bin_id?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export async function getAudits(params?: AuditListParams): Promise<Audit[]> {
  const { data } = await api.get<Audit[]>('/api/audits', { params });
  return data;
}

export async function getAudit(id: number): Promise<Audit> {
  const { data } = await api.get<Audit>(`/api/audits/${id}`);
  return data;
}

export async function createAudit(formData: FormData): Promise<Audit> {
  const { data } = await api.post<Audit>('/api/audits', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ── Classification ──

export async function classifyAudit(auditId: number): Promise<AIPrediction> {
  const { data } = await api.post<AIPrediction>(`/api/audits/${auditId}/classify`);
  return data;
}

// ── Weight Confirmation ──

export async function confirmWeight(auditId: number, weightKg: number): Promise<Audit> {
  const formData = new FormData();
  formData.append('measured_weight_kg', String(weightKg));
  const { data } = await api.patch<Audit>(`/api/audits/${auditId}/weight`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ── Review Queue ──

export async function getReviewQueue(): Promise<ReviewQueueItem[]> {
  const { data } = await api.get<ReviewQueueItem[]>('/api/review-queue');
  return data;
}

export async function verifyItem(
  itemId: number,
  payload: VerificationPayload,
): Promise<DetectedItem> {
  const { data } = await api.put<DetectedItem>(`/api/review-queue/${itemId}`, payload);
  return data;
}

export async function markAuditVerified(auditId: number): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>(`/api/audits/${auditId}/verify-complete`);
  return data;
}

// ── Analytics ──

export interface AnalyticsParams {
  date_from?: string;
  date_to?: string;
  building?: string;
  bin_id?: number;
}

export async function getAnalyticsComposition(
  params?: AnalyticsParams,
): Promise<WasteComposition[]> {
  const { data } = await api.get<WasteComposition[]>('/api/analytics/waste-composition', { params });
  return data;
}

export async function getAnalyticsContaminationTrend(
  params?: AnalyticsParams,
): Promise<ContaminationTrendPoint[]> {
  const { data } = await api.get<ContaminationTrendPoint[]>('/api/analytics/contamination-trends', {
    params,
  });
  return data;
}

export async function getAnalyticsAudits(
  params?: AnalyticsParams & { page?: number; page_size?: number },
): Promise<PaginatedAuditHistory> {
  const { data } = await api.get<PaginatedAuditHistory>('/api/analytics/audit-history', {
    params,
  });
  return data;
}

export function getExportCsvUrl(params?: AnalyticsParams): string {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }
  const qs = searchParams.toString();
  return `${API_BASE_URL}/api/analytics/export-csv${qs ? `?${qs}` : ''}`;
}

export default api;
