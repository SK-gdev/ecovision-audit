// ── Bin ──
export interface Bin {
  id: number;
  name: string;
  building: string;
  floor: string;
  description: string | null;
  accepted_waste_types: string;
  qr_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BinCreate {
  name: string;
  building: string;
  floor: string;
  description?: string;
  accepted_waste_types: string;
}

export interface BinUpdate {
  name?: string;
  building?: string;
  floor?: string;
  description?: string;
  accepted_waste_types?: string;
  is_active?: boolean;
}

// ── Audit ──
export interface Audit {
  id: number;
  bin_id: number;
  photo_path: string;
  measured_weight_kg: number | null;
  notes: string | null;
  status: 'pending' | 'classified' | 'verified' | 'rejected' | string;
  submitted_by: string;
  created_at: string;
  weight_human_confirmed?: boolean;
  bin?: Bin;
  prediction?: AIPrediction;
  summary?: AuditSummary;
}

// ── AI Prediction ──
export interface AIPrediction {
  id: number;
  audit_id: number;
  model_name: string;
  confidence_threshold: number;
  is_demo_mode: boolean;
  processing_time_ms: number;
  created_at: string;
  detected_items: DetectedItem[];
  estimated_weight_kg?: number | null;
  weight_confidence?: number | null;
  weight_notes?: string | null;
}

// ── Detected Item ──
export interface DetectedItem {
  id: number;
  prediction_id: number;
  class_name: string;
  label?: string;        // human-readable label from Gemini e.g. "water bottle"
  confidence: number;
  bbox_x: number;
  bbox_y: number;
  bbox_w: number;
  bbox_h: number;
  is_contamination: boolean;
  human_verified: boolean;
  human_corrected_class: string | null;
  verified_by: string | null;
  verified_at: string | null;
}

// ── Audit Summary ──
export interface AuditSummary {
  id: number;
  audit_id: number;
  total_items_detected: number;
  plastic_items: number;
  recyclable_items: number;
  contamination_count: number;
  contamination_rate: number;
  created_at: string;
}

// ── Dashboard ──
export interface DashboardStats {
  total_weight_kg: number;
  total_audits: number;
  total_plastic_items: number;
  total_recyclable_items: number;
  avg_contamination_rate: number;
  // Fallbacks if alternate naming used
  plastic_items?: number;
  recyclable_items?: number;
}

export interface MonthlyTrend {
  month: string;
  total_weight_kg: number;
  total_audits: number;
  avg_contamination_rate: number;
  // Aliases for compatibility
  audit_count?: number;
  total_weight?: number;
  plastic_items?: number;
  contamination_rate?: number;
}

export interface WasteComposition {
  class_name: string;
  count: number;
  percentage: number;
}

export interface ContaminationHotspot {
  building: string;
  bin_name: string;
  avg_contamination_rate: number;
  audit_count: number;
  contamination_rate?: number;
}

export interface RecentAudit {
  id: number;
  bin_name: string;
  building: string;
  measured_weight_kg: number;
  status: string;
  submitted_by: string;
  created_at: string;
}

// ── Review Queue ──
export interface ReviewQueueItem extends DetectedItem {
  // Attached details if joined or augmented
  audit_id?: number;
  photo_path?: string;
  bin_name?: string;
  building?: string;
}

export interface VerificationPayload {
  human_corrected_class?: string | null;
  is_contamination: boolean;
  verified_by: string;
}

// ── Analytics ──
export interface ContaminationTrendPoint {
  date: string;
  contamination_rate: number;
  audit_count: number;
}

export interface AuditHistoryItem {
  id: number;
  bin_name: string;
  building: string;
  measured_weight_kg: number;
  status: string;
  total_items: number;
  contamination_rate: number;
  submitted_by: string;
  created_at: string;
}

export interface PaginatedAuditHistory {
  items: AuditHistoryItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AnalyticsFilters {
  date_from?: string;
  date_to?: string;
  building?: string;
  bin_id?: number;
  waste_category?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
