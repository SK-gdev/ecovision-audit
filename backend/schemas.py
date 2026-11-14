from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Bins
# ---------------------------------------------------------------------------

class BinCreate(BaseModel):
    name: str
    building: str
    floor: str
    description: Optional[str] = None
    accepted_waste_types: str = "plastic,paper,general"


class BinUpdate(BaseModel):
    name: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[str] = None
    description: Optional[str] = None
    accepted_waste_types: Optional[str] = None
    is_active: Optional[bool] = None


class BinResponse(BaseModel):
    id: int
    name: str
    building: str
    floor: str
    description: Optional[str]
    accepted_waste_types: str
    qr_code: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Detected items
# ---------------------------------------------------------------------------

class DetectedItemResponse(BaseModel):
    id: int
    prediction_id: int
    class_name: str
    label: Optional[str] = None          # e.g. "water bottle" from Gemini
    confidence: float
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float
    is_contamination: bool
    human_verified: bool
    human_corrected_class: Optional[str]
    verified_by: Optional[str]
    verified_at: Optional[datetime]

    class Config:
        from_attributes = True


class DetectedItemVerify(BaseModel):
    human_corrected_class: Optional[str] = None
    is_contamination: bool
    verified_by: str


# ---------------------------------------------------------------------------
# AI Predictions
# ---------------------------------------------------------------------------

class PredictionResponse(BaseModel):
    id: int
    audit_id: int
    model_name: str
    confidence_threshold: float
    is_demo_mode: bool
    processing_time_ms: float
    estimated_weight_kg: Optional[float] = None
    weight_confidence: Optional[float] = None
    weight_notes: Optional[str] = None
    created_at: datetime
    detected_items: List[DetectedItemResponse] = []

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Audit summaries
# ---------------------------------------------------------------------------

class AuditSummaryResponse(BaseModel):
    id: int
    audit_id: int
    total_items_detected: int
    plastic_items: int
    recyclable_items: int
    contamination_count: int
    contamination_rate: float
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Audits
# ---------------------------------------------------------------------------

class AuditResponse(BaseModel):
    id: int
    bin_id: int
    photo_path: str
    measured_weight_kg: Optional[float] = None
    weight_human_confirmed: bool = False
    notes: Optional[str]
    status: str
    submitted_by: str
    created_at: datetime
    bin: Optional[BinResponse] = None

    class Config:
        from_attributes = True


class AuditDetailResponse(AuditResponse):
    prediction: Optional[PredictionResponse] = None
    summary: Optional[AuditSummaryResponse] = None


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class DashboardStats(BaseModel):
    total_weight_kg: float
    total_audits: int
    total_plastic_items: int
    total_recyclable_items: int
    avg_contamination_rate: float


class RecentAudit(BaseModel):
    id: int
    bin_name: str
    building: str
    measured_weight_kg: float
    status: str
    submitted_by: str
    created_at: datetime


class ContaminationHotspot(BaseModel):
    building: str
    bin_name: str
    avg_contamination_rate: float
    audit_count: int


class MonthlyTrend(BaseModel):
    month: str
    total_audits: int
    total_weight_kg: float
    avg_contamination_rate: float


class WasteCompositionItem(BaseModel):
    class_name: str
    count: int
    percentage: float


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

class ContaminationTrendPoint(BaseModel):
    date: str
    contamination_rate: float
    audit_count: int


class AuditHistoryItem(BaseModel):
    id: int
    bin_name: str
    building: str
    measured_weight_kg: float
    status: str
    total_items: int
    contamination_rate: float
    submitted_by: str
    created_at: datetime


class PaginatedAuditHistory(BaseModel):
    items: List[AuditHistoryItem]
    total: int
    page: int
    page_size: int
    total_pages: int
