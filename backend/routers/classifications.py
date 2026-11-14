import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ai_classifier import PLASTIC_CLASSES, RECYCLABLE_CLASSES, WasteClassifier
from database import get_db
from models import AIPrediction, Audit, AuditSummary, DetectedItem
from schemas import PredictionResponse

router = APIRouter(prefix="/api/audits", tags=["classification"])


@router.post("/{audit_id}/classify", response_model=PredictionResponse)
def classify_audit(audit_id: int, db: Session = Depends(get_db)):
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    classifier = WasteClassifier()

    # Remove previous classification if re-running
    existing = db.query(AIPrediction).filter(AIPrediction.audit_id == audit_id).first()
    if existing:
        # Delete old items, prediction, and summary for a fresh run
        db.query(DetectedItem).filter(DetectedItem.prediction_id == existing.id).delete()
        db.delete(existing)
        old_summary = db.query(AuditSummary).filter(AuditSummary.audit_id == audit_id).first()
        if old_summary:
            db.delete(old_summary)
        db.flush()

    # Resolve photo path relative to the backend directory
    photo_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), audit.photo_path)
    if not os.path.exists(photo_path):
        raise HTTPException(status_code=404, detail="Photo file not found")

    result = classifier.classify(photo_path)

    # Create prediction record
    prediction = AIPrediction(
        audit_id=audit_id,
        model_name=result["model_name"],
        confidence_threshold=result["confidence_threshold"],
        is_demo_mode=result["is_demo_mode"],
        processing_time_ms=result["processing_time_ms"],
        estimated_weight_kg=result.get("estimated_weight_kg"),
        weight_confidence=result.get("weight_confidence"),
        weight_notes=result.get("weight_notes"),
    )
    db.add(prediction)
    db.flush()

    # Create detected items
    for item in result["items"]:
        detected = DetectedItem(
            prediction_id=prediction.id,
            class_name=item["class_name"],
            label=item.get("label", item["class_name"]),
            confidence=item["confidence"],
            bbox_x=item["bbox_x"],
            bbox_y=item["bbox_y"],
            bbox_w=item["bbox_w"],
            bbox_h=item["bbox_h"],
            is_contamination=item["is_contamination"],
        )
        db.add(detected)

    # Create audit summary
    items_list = result["items"]
    total = len(items_list)
    plastic_count = sum(1 for i in items_list if i["class_name"] in PLASTIC_CLASSES)
    recyclable_count = sum(1 for i in items_list if i["class_name"] in RECYCLABLE_CLASSES)
    contamination_count = sum(1 for i in items_list if i["is_contamination"])
    contamination_rate = contamination_count / total if total > 0 else 0.0

    summary = AuditSummary(
        audit_id=audit_id,
        total_items_detected=total,
        plastic_items=plastic_count,
        recyclable_items=recyclable_count,
        contamination_count=contamination_count,
        contamination_rate=round(contamination_rate, 4),
    )
    db.add(summary)

    # Auto-fill audit measured_weight_kg if not set or 0
    if not audit.measured_weight_kg:
        est_weight = result.get("estimated_weight_kg")
        if est_weight is not None:
            audit.measured_weight_kg = est_weight

    # Update audit status
    audit.status = "classified"
    db.commit()
    db.refresh(prediction)

    # Reload with items
    prediction = (
        db.query(AIPrediction)
        .options(joinedload(AIPrediction.detected_items))
        .filter(AIPrediction.id == prediction.id)
        .first()
    )
    return prediction
