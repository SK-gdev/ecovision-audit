from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship

from database import Base


class Bin(Base):
    __tablename__ = "bins"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    building = Column(String, nullable=False)
    floor = Column(String, nullable=False)
    description = Column(String, nullable=True)
    accepted_waste_types = Column(String, nullable=False, default="plastic,paper,general")
    qr_code = Column(String, unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    audits = relationship("Audit", back_populates="bin")


class Audit(Base):
    __tablename__ = "audits"

    id = Column(Integer, primary_key=True, index=True)
    bin_id = Column(Integer, ForeignKey("bins.id"), nullable=False)
    photo_path = Column(String, nullable=False)
    measured_weight_kg = Column(Float, nullable=True)   # None = use AI estimate
    weight_human_confirmed = Column(Boolean, default=False)
    notes = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending/classified/verified/rejected
    submitted_by = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    bin = relationship("Bin", back_populates="audits")
    prediction = relationship("AIPrediction", back_populates="audit", uselist=False)
    summary = relationship("AuditSummary", back_populates="audit", uselist=False)


class AIPrediction(Base):
    __tablename__ = "ai_predictions"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"), unique=True, nullable=False)
    model_name = Column(String, nullable=False)
    confidence_threshold = Column(Float, default=0.7)
    is_demo_mode = Column(Boolean, nullable=False)
    processing_time_ms = Column(Float, nullable=False)
    # AI weight estimation
    estimated_weight_kg = Column(Float, nullable=True)
    weight_confidence = Column(Float, nullable=True)
    weight_notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    audit = relationship("Audit", back_populates="prediction")
    detected_items = relationship("DetectedItem", back_populates="prediction", cascade="all, delete-orphan")


class DetectedItem(Base):
    __tablename__ = "detected_items"

    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("ai_predictions.id"), nullable=False)
    class_name = Column(String, nullable=False)
    label = Column(String, nullable=True)       # human-readable label from Gemini (e.g. "water bottle")
    confidence = Column(Float, nullable=False)
    bbox_x = Column(Float, nullable=False)
    bbox_y = Column(Float, nullable=False)
    bbox_w = Column(Float, nullable=False)
    bbox_h = Column(Float, nullable=False)
    is_contamination = Column(Boolean, default=False)
    human_verified = Column(Boolean, default=False)
    human_corrected_class = Column(String, nullable=True)
    verified_by = Column(String, nullable=True)
    verified_at = Column(DateTime, nullable=True)

    prediction = relationship("AIPrediction", back_populates="detected_items")


class AuditSummary(Base):
    __tablename__ = "audit_summaries"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"), unique=True, nullable=False)
    total_items_detected = Column(Integer, nullable=False)
    plastic_items = Column(Integer, nullable=False)
    recyclable_items = Column(Integer, nullable=False)
    contamination_count = Column(Integer, nullable=False)
    contamination_rate = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    audit = relationship("Audit", back_populates="summary")
