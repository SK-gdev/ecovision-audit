from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ai_classifier import PLASTIC_CLASSES, RECYCLABLE_CLASSES
from database import get_db
from models import AIPrediction, Audit, AuditSummary, DetectedItem
from schemas import DetectedItemResponse, DetectedItemVerify

router = APIRouter(tags=["review"])


@router.get("/api/review-queue", response_model=list[DetectedItemResponse])
def get_review_queue(db: Session = Depends(get_db)):
    """Items needing human review: not yet verified and confidence below threshold."""
    items = (
        db.query(DetectedItem)
        .join(AIPrediction)
        .filter(
            DetectedItem.human_verified == False,
            DetectedItem.confidence < AIPrediction.confidence_threshold,
        )
        .all()
    )
    return items


@router.put("/api/review-queue/{item_id}", response_model=DetectedItemResponse)
def verify_item(item_id: int, data: DetectedItemVerify, db: Session = Depends(get_db)):
    item = db.query(DetectedItem).filter(DetectedItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Detected item not found")

    item.human_verified = True
    item.verified_by = data.verified_by
    item.verified_at = datetime.utcnow()
    item.is_contamination = data.is_contamination

    if data.human_corrected_class:
        item.human_corrected_class = data.human_corrected_class

    db.commit()
    db.refresh(item)
    return item


@router.post("/api/audits/{audit_id}/verify-complete", status_code=200)
def verify_complete(audit_id: int, db: Session = Depends(get_db)):
    """Mark audit as verified and recalculate summary."""
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    prediction = db.query(AIPrediction).filter(AIPrediction.audit_id == audit_id).first()
    if not prediction:
        raise HTTPException(status_code=400, detail="Audit has no prediction to verify")

    items = db.query(DetectedItem).filter(DetectedItem.prediction_id == prediction.id).all()

    # Recalculate summary using corrected classes where available
    total = len(items)
    plastic_count = 0
    recyclable_count = 0
    contamination_count = 0

    for item in items:
        effective_class = item.human_corrected_class or item.class_name
        if effective_class in PLASTIC_CLASSES:
            plastic_count += 1
        if effective_class in RECYCLABLE_CLASSES:
            recyclable_count += 1
        if item.is_contamination:
            contamination_count += 1

    contamination_rate = contamination_count / total if total > 0 else 0.0

    summary = db.query(AuditSummary).filter(AuditSummary.audit_id == audit_id).first()
    if summary:
        summary.total_items_detected = total
        summary.plastic_items = plastic_count
        summary.recyclable_items = recyclable_count
        summary.contamination_count = contamination_count
        summary.contamination_rate = round(contamination_rate, 4)
    else:
        summary = AuditSummary(
            audit_id=audit_id,
            total_items_detected=total,
            plastic_items=plastic_count,
            recyclable_items=recyclable_count,
            contamination_count=contamination_count,
            contamination_rate=round(contamination_rate, 4),
        )
        db.add(summary)

    audit.status = "verified"
    db.commit()
    return {"message": "Audit verified and summary recalculated"}
