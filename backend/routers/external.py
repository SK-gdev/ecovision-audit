"""
External Integration Router — EcoVision Audit
==============================================

Provides an API for external systems (such as the EcoVision Robotics
hardware simulation or IoT smart bins) to push waste-sorting events
directly into the audit database.

This lets the conveyor/robot simulation log each sorted item as it
happens, without requiring a photo upload or manual audit form.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ai_classifier import CLASSES, PLASTIC_CLASSES, RECYCLABLE_CLASSES
from database import get_db
from models import AIPrediction, Audit, AuditSummary, Bin, DetectedItem

router = APIRouter(prefix="/api/external", tags=["external-integration"])


# ── Request schemas ────────────────────────────────────────────────────

class ExternalDetection(BaseModel):
    """A single detected / sorted item from an external system."""
    class_name: str = Field(..., description="One of: PET Bottle, HDPE Container, Plastic Wrapper, Foam Cup, Paper, Other")
    confidence: float = Field(0.85, ge=0.0, le=1.0)
    is_contamination: bool = False


class ExternalWasteLog(BaseModel):
    """
    A batch of sorted items from the robotics simulation or IoT system.

    Can reference an existing bin by ID or QR code, or just pass
    a source_label string for ad-hoc entries.
    """
    bin_id: Optional[int] = None
    bin_qr_code: Optional[str] = None
    source_label: str = Field("Robotics Station", description="Human-readable source name")
    measured_weight_kg: float = Field(..., gt=0, description="Total weight of this batch (kg)")
    items: List[ExternalDetection] = Field(..., min_length=1)
    submitted_by: str = "robotics-system"
    notes: Optional[str] = None
    model_name: str = "external-system"
    is_demo_mode: bool = True


class ExternalLogResponse(BaseModel):
    audit_id: int
    bin_id: int
    total_items: int
    plastic_items: int
    recyclable_items: int
    contamination_rate: float
    message: str


# ── Endpoint ───────────────────────────────────────────────────────────

@router.post("/log-waste", response_model=ExternalLogResponse, status_code=201)
def log_external_waste(data: ExternalWasteLog, db: Session = Depends(get_db)):
    """
    Receive a batch of waste items from an external system and create
    a complete audit record (audit + prediction + items + summary).

    Used by:
    - EcoVision Robotics conveyor simulation
    - IoT smart-bin fill-level dispatchers
    - Manual bulk-logging scripts
    """

    # Resolve bin
    bin_obj = None
    if data.bin_id:
        bin_obj = db.query(Bin).filter(Bin.id == data.bin_id, Bin.is_active == True).first()
    elif data.bin_qr_code:
        bin_obj = db.query(Bin).filter(Bin.qr_code == data.bin_qr_code, Bin.is_active == True).first()

    if not bin_obj:
        # Auto-create a virtual bin for external sources
        bin_obj = db.query(Bin).filter(Bin.name == data.source_label, Bin.is_active == True).first()
        if not bin_obj:
            bin_obj = Bin(
                name=data.source_label,
                building="External / Robotics",
                floor="Automated",
                description=f"Auto-created bin for external system: {data.source_label}",
                accepted_waste_types="plastic,paper,general",
                qr_code=str(uuid.uuid4()),
            )
            db.add(bin_obj)
            db.flush()

    # Validate class names
    valid_classes = set(CLASSES)
    for item in data.items:
        if item.class_name not in valid_classes:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid class_name '{item.class_name}'. Must be one of: {CLASSES}",
            )

    # Create audit (no photo for external entries)
    audit = Audit(
        bin_id=bin_obj.id,
        photo_path="",  # no photo for external logs
        measured_weight_kg=data.measured_weight_kg,
        notes=data.notes or f"External log from {data.source_label}",
        status="classified",
        submitted_by=data.submitted_by,
    )
    db.add(audit)
    db.flush()

    # Create AI prediction record
    prediction = AIPrediction(
        audit_id=audit.id,
        model_name=data.model_name,
        confidence_threshold=0.7,
        is_demo_mode=data.is_demo_mode,
        processing_time_ms=0.0,
    )
    db.add(prediction)
    db.flush()

    # Create detected items
    plastic_count = 0
    recyclable_count = 0
    contamination_count = 0

    for item_data in data.items:
        detected = DetectedItem(
            prediction_id=prediction.id,
            class_name=item_data.class_name,
            confidence=item_data.confidence,
            bbox_x=0, bbox_y=0, bbox_w=0, bbox_h=0,  # no spatial data for external
            is_contamination=item_data.is_contamination,
            human_verified=True,  # external systems are pre-verified
            human_corrected_class=None,
            verified_by=data.submitted_by,
            verified_at=datetime.utcnow(),
        )
        db.add(detected)

        if item_data.class_name in PLASTIC_CLASSES:
            plastic_count += 1
        if item_data.class_name in RECYCLABLE_CLASSES:
            recyclable_count += 1
        if item_data.is_contamination:
            contamination_count += 1

    total = len(data.items)
    contamination_rate = contamination_count / total if total > 0 else 0.0

    # Create summary
    summary = AuditSummary(
        audit_id=audit.id,
        total_items_detected=total,
        plastic_items=plastic_count,
        recyclable_items=recyclable_count,
        contamination_count=contamination_count,
        contamination_rate=round(contamination_rate, 4),
    )
    db.add(summary)

    db.commit()

    return ExternalLogResponse(
        audit_id=audit.id,
        bin_id=bin_obj.id,
        total_items=total,
        plastic_items=plastic_count,
        recyclable_items=recyclable_count,
        contamination_rate=round(contamination_rate, 4),
        message=f"Successfully logged {total} items ({data.measured_weight_kg} kg) from {data.source_label}",
    )


# ── Batch status endpoint ─────────────────────────────────────────────

@router.get("/integration-status")
def integration_status(db: Session = Depends(get_db)):
    """Check how many external logs have been received."""
    external_audits = db.query(Audit).filter(
        Audit.submitted_by.in_(["robotics-system", "iot-system", "external-system"])
    ).count()

    return {
        "external_audits_logged": external_audits,
        "supported_classes": CLASSES,
        "endpoint": "/api/external/log-waste",
        "status": "ready",
    }
