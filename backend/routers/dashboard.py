from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Audit, AuditSummary, Bin, DetectedItem, AIPrediction
from schemas import (
    ContaminationHotspot,
    DashboardStats,
    MonthlyTrend,
    RecentAudit,
    WasteCompositionItem,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db)):
    total_weight = db.query(func.coalesce(func.sum(Audit.measured_weight_kg), 0.0)).scalar()
    total_audits = db.query(func.count(Audit.id)).scalar()

    total_plastic = db.query(func.coalesce(func.sum(AuditSummary.plastic_items), 0)).scalar()
    total_recyclable = db.query(func.coalesce(func.sum(AuditSummary.recyclable_items), 0)).scalar()
    avg_contamination = db.query(func.coalesce(func.avg(AuditSummary.contamination_rate), 0.0)).scalar()

    return DashboardStats(
        total_weight_kg=round(float(total_weight), 2),
        total_audits=int(total_audits),
        total_plastic_items=int(total_plastic),
        total_recyclable_items=int(total_recyclable),
        avg_contamination_rate=round(float(avg_contamination), 4),
    )


@router.get("/recent-audits", response_model=list[RecentAudit])
def recent_audits(db: Session = Depends(get_db)):
    rows = (
        db.query(Audit, Bin)
        .join(Bin, Audit.bin_id == Bin.id)
        .order_by(Audit.created_at.desc())
        .limit(10)
        .all()
    )
    return [
        RecentAudit(
            id=audit.id,
            bin_name=bin_obj.name,
            building=bin_obj.building,
            measured_weight_kg=audit.measured_weight_kg,
            status=audit.status,
            submitted_by=audit.submitted_by,
            created_at=audit.created_at,
        )
        for audit, bin_obj in rows
    ]


@router.get("/contamination-hotspots", response_model=list[ContaminationHotspot])
def contamination_hotspots(db: Session = Depends(get_db)):
    rows = (
        db.query(
            Bin.building,
            Bin.name,
            func.avg(AuditSummary.contamination_rate).label("avg_rate"),
            func.count(Audit.id).label("audit_count"),
        )
        .join(Audit, Audit.bin_id == Bin.id)
        .join(AuditSummary, AuditSummary.audit_id == Audit.id)
        .group_by(Bin.id)
        .order_by(func.avg(AuditSummary.contamination_rate).desc())
        .limit(5)
        .all()
    )
    return [
        ContaminationHotspot(
            building=row.building,
            bin_name=row.name,
            avg_contamination_rate=round(float(row.avg_rate), 4),
            audit_count=int(row.audit_count),
        )
        for row in rows
    ]


@router.get("/monthly-trends", response_model=list[MonthlyTrend])
def monthly_trends(db: Session = Depends(get_db)):
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    rows = (
        db.query(
            func.strftime("%Y-%m", Audit.created_at).label("month"),
            func.count(Audit.id).label("total_audits"),
            func.coalesce(func.sum(Audit.measured_weight_kg), 0.0).label("total_weight"),
            func.coalesce(func.avg(AuditSummary.contamination_rate), 0.0).label("avg_contam"),
        )
        .outerjoin(AuditSummary, AuditSummary.audit_id == Audit.id)
        .filter(Audit.created_at >= six_months_ago)
        .group_by(func.strftime("%Y-%m", Audit.created_at))
        .order_by(func.strftime("%Y-%m", Audit.created_at))
        .all()
    )
    return [
        MonthlyTrend(
            month=row.month,
            total_audits=int(row.total_audits),
            total_weight_kg=round(float(row.total_weight), 2),
            avg_contamination_rate=round(float(row.avg_contam), 4),
        )
        for row in rows
    ]


@router.get("/waste-composition", response_model=list[WasteCompositionItem])
def waste_composition(db: Session = Depends(get_db)):
    total = db.query(func.count(DetectedItem.id)).scalar() or 1

    rows = (
        db.query(
            DetectedItem.class_name,
            func.count(DetectedItem.id).label("count"),
        )
        .group_by(DetectedItem.class_name)
        .order_by(func.count(DetectedItem.id).desc())
        .all()
    )
    return [
        WasteCompositionItem(
            class_name=row.class_name,
            count=int(row.count),
            percentage=round(int(row.count) / total * 100, 2),
        )
        for row in rows
    ]
