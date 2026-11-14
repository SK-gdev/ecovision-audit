"""Seed the database with demo data for development."""

import os
import random
import uuid
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from ai_classifier import CLASSES, PLASTIC_CLASSES, RECYCLABLE_CLASSES
from database import SessionLocal, engine
from models import AIPrediction, Audit, AuditSummary, Base, Bin, DetectedItem

BUILDINGS = [
    ("Engineering Block", ["Ground Floor", "First Floor", "Second Floor"]),
    ("Science Building", ["Ground Floor", "First Floor"]),
    ("Student Union", ["Ground Floor", "First Floor"]),
    ("Library", ["Ground Floor", "First Floor", "Second Floor"]),
    ("Cafeteria", ["Ground Floor"]),
]

BIN_CONFIGS = [
    {"name": "Cafeteria Bin A", "building": "Cafeteria", "floor": "Ground Floor", "accepted": "plastic,paper,general"},
    {"name": "Cafeteria Bin B", "building": "Cafeteria", "floor": "Ground Floor", "accepted": "plastic,general"},
    {"name": "Engineering Lobby Bin", "building": "Engineering Block", "floor": "Ground Floor", "accepted": "plastic,paper"},
    {"name": "Engineering Lab Bin", "building": "Engineering Block", "floor": "First Floor", "accepted": "plastic,paper,general"},
    {"name": "Science Hallway Bin", "building": "Science Building", "floor": "Ground Floor", "accepted": "plastic,paper,general"},
    {"name": "Science Lab Bin", "building": "Science Building", "floor": "First Floor", "accepted": "plastic,general"},
    {"name": "Student Union Lounge Bin", "building": "Student Union", "floor": "Ground Floor", "accepted": "plastic,paper,general"},
    {"name": "Library Entrance Bin", "building": "Library", "floor": "Ground Floor", "accepted": "paper,general"},
    {"name": "Library Study Area Bin", "building": "Library", "floor": "Second Floor", "accepted": "plastic,paper"},
    {"name": "Student Union Café Bin", "building": "Student Union", "floor": "First Floor", "accepted": "plastic,paper,general"},
]


def _random_date_within_months(months: int = 3) -> datetime:
    now = datetime.utcnow()
    delta = timedelta(days=random.randint(1, months * 30))
    return now - delta


def _create_dummy_photo() -> str:
    """Create a tiny placeholder image and return relative path."""
    upload_dir = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    filename = f"{uuid.uuid4()}.jpg"
    filepath = os.path.join(upload_dir, filename)

    # Create a tiny valid JPEG via PIL
    try:
        from PIL import Image

        img = Image.new("RGB", (640, 480), color=(200, 200, 200))
        img.save(filepath, "JPEG")
    except Exception:
        # Fallback: write a minimal file
        with open(filepath, "wb") as f:
            f.write(b"\xff\xd8\xff\xe0" + b"\x00" * 100)

    return f"uploads/{filename}"


def seed(db: Session) -> None:
    """Insert demo bins, audits, predictions and items."""

    # --- Bins ---
    bins = []
    for cfg in BIN_CONFIGS:
        b = Bin(
            name=cfg["name"],
            building=cfg["building"],
            floor=cfg["floor"],
            description=f"Demo bin at {cfg['building']} – {cfg['floor']}",
            accepted_waste_types=cfg["accepted"],
            qr_code=str(uuid.uuid4()),
        )
        db.add(b)
        bins.append(b)

    db.flush()

    # --- Audits + predictions ---
    statuses = ["pending", "classified", "verified", "rejected"]
    status_weights = [0.15, 0.35, 0.40, 0.10]

    num_audits = random.randint(20, 30)
    for _ in range(num_audits):
        chosen_bin = random.choice(bins)
        status = random.choices(statuses, weights=status_weights, k=1)[0]
        audit_date = _random_date_within_months(3)

        photo_path = _create_dummy_photo()

        audit = Audit(
            bin_id=chosen_bin.id,
            photo_path=photo_path,
            measured_weight_kg=round(random.uniform(0.1, 5.0), 2),
            notes=random.choice([None, "Looks full", "Mixed waste", "Mostly bottles", "Light load"]),
            status=status,
            submitted_by="demo-system",
            created_at=audit_date,
        )
        db.add(audit)
        db.flush()

        # Skip prediction for purely pending audits
        if status == "pending":
            continue

        # Create prediction
        num_items = random.randint(3, 7)
        processing_ms = round(random.uniform(50, 300), 2)
        prediction = AIPrediction(
            audit_id=audit.id,
            model_name="demo-mode",
            confidence_threshold=0.7,
            is_demo_mode=True,
            processing_time_ms=processing_ms,
            created_at=audit_date,
        )
        db.add(prediction)
        db.flush()

        # Create detected items
        items = []
        for _ in range(num_items):
            cls = random.choice(CLASSES)
            confidence = round(random.uniform(0.40, 0.99), 4)
            is_verified = status == "verified"

            item = DetectedItem(
                prediction_id=prediction.id,
                class_name=cls,
                confidence=confidence,
                bbox_x=round(random.uniform(0, 500), 2),
                bbox_y=round(random.uniform(0, 350), 2),
                bbox_w=round(random.uniform(30, 160), 2),
                bbox_h=round(random.uniform(30, 150), 2),
                is_contamination=cls not in PLASTIC_CLASSES,
                human_verified=is_verified,
                verified_by="demo-system" if is_verified else None,
                verified_at=audit_date if is_verified else None,
            )
            db.add(item)
            items.append(item)

        # Audit summary
        total = len(items)
        plastic_count = sum(1 for i in items if i.class_name in PLASTIC_CLASSES)
        recyclable_count = sum(1 for i in items if i.class_name in RECYCLABLE_CLASSES)
        contamination_count = sum(1 for i in items if i.is_contamination)
        contamination_rate = contamination_count / total if total > 0 else 0.0

        summary = AuditSummary(
            audit_id=audit.id,
            total_items_detected=total,
            plastic_items=plastic_count,
            recyclable_items=recyclable_count,
            contamination_count=contamination_count,
            contamination_rate=round(contamination_rate, 4),
            created_at=audit_date,
        )
        db.add(summary)

    db.commit()


def run_seed() -> None:
    """Entry point: create tables and seed if DB is empty."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(Bin).first()
        if existing is None:
            seed(db)
            print("✓ Database seeded with demo data.")
        else:
            print("Database already contains data – skipping seed.")
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
