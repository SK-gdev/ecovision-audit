import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Audit, AuditSummary, Bin, DetectedItem, AIPrediction
from schemas import (
    AuditHistoryItem,
    ContaminationTrendPoint,
    PaginatedAuditHistory,
    WasteCompositionItem,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# -----------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------

def _parse_date(val: str | None) -> datetime | None:
    if val:
        return datetime.fromisoformat(val)
    return None


# -----------------------------------------------------------------------
# Waste composition (filtered)
# -----------------------------------------------------------------------

@router.get("/waste-composition", response_model=list[WasteCompositionItem])
def analytics_waste_composition(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    building: str | None = Query(None),
    bin_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    query = (
        db.query(
            DetectedItem.class_name,
            func.count(DetectedItem.id).label("count"),
        )
        .join(AIPrediction, DetectedItem.prediction_id == AIPrediction.id)
        .join(Audit, AIPrediction.audit_id == Audit.id)
        .join(Bin, Audit.bin_id == Bin.id)
    )

    if date_from:
        query = query.filter(Audit.created_at >= _parse_date(date_from))
    if date_to:
        query = query.filter(Audit.created_at <= _parse_date(date_to))
    if building:
        query = query.filter(Bin.building == building)
    if bin_id is not None:
        query = query.filter(Audit.bin_id == bin_id)

    rows = query.group_by(DetectedItem.class_name).order_by(func.count(DetectedItem.id).desc()).all()

    total = sum(r.count for r in rows) or 1
    return [
        WasteCompositionItem(
            class_name=row.class_name,
            count=int(row.count),
            percentage=round(int(row.count) / total * 100, 2),
        )
        for row in rows
    ]


# -----------------------------------------------------------------------
# Contamination trends
# -----------------------------------------------------------------------

@router.get("/contamination-trends", response_model=list[ContaminationTrendPoint])
def contamination_trends(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    building: str | None = Query(None),
    bin_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    query = (
        db.query(
            func.strftime("%Y-%m-%d", Audit.created_at).label("date"),
            func.coalesce(func.avg(AuditSummary.contamination_rate), 0.0).label("rate"),
            func.count(Audit.id).label("count"),
        )
        .join(AuditSummary, AuditSummary.audit_id == Audit.id)
        .join(Bin, Audit.bin_id == Bin.id)
    )

    if date_from:
        query = query.filter(Audit.created_at >= _parse_date(date_from))
    if date_to:
        query = query.filter(Audit.created_at <= _parse_date(date_to))
    if building:
        query = query.filter(Bin.building == building)
    if bin_id is not None:
        query = query.filter(Audit.bin_id == bin_id)

    rows = (
        query.group_by(func.strftime("%Y-%m-%d", Audit.created_at))
        .order_by(func.strftime("%Y-%m-%d", Audit.created_at))
        .all()
    )
    return [
        ContaminationTrendPoint(
            date=row.date,
            contamination_rate=round(float(row.rate), 4),
            audit_count=int(row.count),
        )
        for row in rows
    ]


# -----------------------------------------------------------------------
# Audit history (paginated)
# -----------------------------------------------------------------------

@router.get("/audit-history", response_model=PaginatedAuditHistory)
def audit_history(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    building: str | None = Query(None),
    bin_id: int | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = (
        db.query(
            Audit.id,
            Bin.name.label("bin_name"),
            Bin.building,
            Audit.measured_weight_kg,
            Audit.status,
            func.coalesce(AuditSummary.total_items_detected, 0).label("total_items"),
            func.coalesce(AuditSummary.contamination_rate, 0.0).label("contamination_rate"),
            Audit.submitted_by,
            Audit.created_at,
        )
        .join(Bin, Audit.bin_id == Bin.id)
        .outerjoin(AuditSummary, AuditSummary.audit_id == Audit.id)
    )

    if date_from:
        query = query.filter(Audit.created_at >= _parse_date(date_from))
    if date_to:
        query = query.filter(Audit.created_at <= _parse_date(date_to))
    if building:
        query = query.filter(Bin.building == building)
    if bin_id is not None:
        query = query.filter(Audit.bin_id == bin_id)
    if status:
        query = query.filter(Audit.status == status)

    total = query.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    offset = (page - 1) * page_size

    rows = query.order_by(Audit.created_at.desc()).offset(offset).limit(page_size).all()

    items = [
        AuditHistoryItem(
            id=row.id,
            bin_name=row.bin_name,
            building=row.building,
            measured_weight_kg=row.measured_weight_kg,
            status=row.status,
            total_items=int(row.total_items),
            contamination_rate=round(float(row.contamination_rate), 4),
            submitted_by=row.submitted_by,
            created_at=row.created_at,
        )
        for row in rows
    ]

    return PaginatedAuditHistory(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# -----------------------------------------------------------------------
# CSV export
# -----------------------------------------------------------------------

@router.get("/export-csv")
def export_csv(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    building: str | None = Query(None),
    bin_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    query = (
        db.query(
            Audit.id,
            Bin.name.label("bin_name"),
            Bin.building,
            Audit.measured_weight_kg,
            Audit.status,
            Audit.submitted_by,
            Audit.created_at,
            func.coalesce(AuditSummary.total_items_detected, 0).label("total_items"),
            func.coalesce(AuditSummary.plastic_items, 0).label("plastic_items"),
            func.coalesce(AuditSummary.recyclable_items, 0).label("recyclable_items"),
            func.coalesce(AuditSummary.contamination_count, 0).label("contamination_count"),
            func.coalesce(AuditSummary.contamination_rate, 0.0).label("contamination_rate"),
        )
        .join(Bin, Audit.bin_id == Bin.id)
        .outerjoin(AuditSummary, AuditSummary.audit_id == Audit.id)
    )

    if date_from:
        query = query.filter(Audit.created_at >= _parse_date(date_from))
    if date_to:
        query = query.filter(Audit.created_at <= _parse_date(date_to))
    if building:
        query = query.filter(Bin.building == building)
    if bin_id is not None:
        query = query.filter(Audit.bin_id == bin_id)

    rows = query.order_by(Audit.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Audit ID", "Bin Name", "Building", "Weight (kg)", "Status",
        "Submitted By", "Date", "Total Items", "Plastic Items",
        "Recyclable Items", "Contamination Count", "Contamination Rate",
    ])
    for row in rows:
        writer.writerow([
            row.id, row.bin_name, row.building, row.measured_weight_kg,
            row.status, row.submitted_by, row.created_at.isoformat(),
            row.total_items, row.plastic_items, row.recyclable_items,
            row.contamination_count, round(float(row.contamination_rate), 4),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ecovision_audit_export.csv"},
    )
