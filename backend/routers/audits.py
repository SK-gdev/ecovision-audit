import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Audit, Bin
from schemas import AuditDetailResponse, AuditResponse

router = APIRouter(prefix="/api/audits", tags=["audits"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("", response_model=AuditResponse, status_code=201)
async def create_audit(
    bin_id: int = Form(...),
    measured_weight_kg: Optional[float] = Form(None),
    submitted_by: str = Form(...),
    notes: str = Form(None),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Validate bin exists
    bin_obj = db.query(Bin).filter(Bin.id == bin_id).first()
    if not bin_obj:
        raise HTTPException(status_code=404, detail="Bin not found")

    # Save uploaded photo with UUID filename
    ext = os.path.splitext(photo.filename or "photo.jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    contents = await photo.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    audit = Audit(
        bin_id=bin_id,
        photo_path=f"uploads/{filename}",
        measured_weight_kg=measured_weight_kg,
        notes=notes,
        submitted_by=submitted_by,
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)

    # Eager-load the bin relationship for the response
    audit = db.query(Audit).options(joinedload(Audit.bin)).filter(Audit.id == audit.id).first()
    return audit


@router.get("", response_model=list[AuditResponse])
def list_audits(
    bin_id: int | None = Query(None),
    status: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Audit).options(joinedload(Audit.bin))

    if bin_id is not None:
        query = query.filter(Audit.bin_id == bin_id)
    if status:
        query = query.filter(Audit.status == status)
    if date_from:
        query = query.filter(Audit.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(Audit.created_at <= datetime.fromisoformat(date_to))

    query = query.order_by(Audit.created_at.desc())
    offset = (page - 1) * page_size
    return query.offset(offset).limit(page_size).all()


@router.get("/{audit_id}", response_model=AuditDetailResponse)
def get_audit(audit_id: int, db: Session = Depends(get_db)):
    audit = (
        db.query(Audit)
        .options(
            joinedload(Audit.bin),
            joinedload(Audit.prediction),
            joinedload(Audit.summary),
        )
        .filter(Audit.id == audit_id)
        .first()
    )
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    return audit


@router.patch("/{audit_id}/weight", response_model=AuditResponse)
def confirm_weight(
    audit_id: int,
    measured_weight_kg: float = Form(...),
    db: Session = Depends(get_db),
):
    """Human confirms or overrides the AI estimated weight."""
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    audit.measured_weight_kg = measured_weight_kg
    audit.weight_human_confirmed = True
    db.commit()
    db.refresh(audit)
    return audit
