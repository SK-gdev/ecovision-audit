import io
import os
import uuid

import qrcode
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Bin
from schemas import BinCreate, BinResponse, BinUpdate

router = APIRouter(prefix="/api/bins", tags=["bins"])


@router.get("", response_model=list[BinResponse])
def list_bins(db: Session = Depends(get_db)):
    return db.query(Bin).filter(Bin.is_active == True).all()


@router.post("", response_model=BinResponse, status_code=201)
def create_bin(data: BinCreate, db: Session = Depends(get_db)):
    bin_obj = Bin(
        name=data.name,
        building=data.building,
        floor=data.floor,
        description=data.description,
        accepted_waste_types=data.accepted_waste_types,
        qr_code=str(uuid.uuid4()),
    )
    db.add(bin_obj)
    db.commit()
    db.refresh(bin_obj)
    return bin_obj


@router.get("/{bin_id}", response_model=BinResponse)
def get_bin(bin_id: int, db: Session = Depends(get_db)):
    bin_obj = db.query(Bin).filter(Bin.id == bin_id).first()
    if not bin_obj:
        raise HTTPException(status_code=404, detail="Bin not found")
    return bin_obj


@router.put("/{bin_id}", response_model=BinResponse)
def update_bin(bin_id: int, data: BinUpdate, db: Session = Depends(get_db)):
    bin_obj = db.query(Bin).filter(Bin.id == bin_id).first()
    if not bin_obj:
        raise HTTPException(status_code=404, detail="Bin not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(bin_obj, key, value)

    db.commit()
    db.refresh(bin_obj)
    return bin_obj


@router.delete("/{bin_id}", status_code=204)
def delete_bin(bin_id: int, db: Session = Depends(get_db)):
    bin_obj = db.query(Bin).filter(Bin.id == bin_id).first()
    if not bin_obj:
        raise HTTPException(status_code=404, detail="Bin not found")
    bin_obj.is_active = False
    db.commit()


@router.get("/{qr_code}/by-qr", response_model=BinResponse)
def get_bin_by_qr(qr_code: str, db: Session = Depends(get_db)):
    bin_obj = db.query(Bin).filter(Bin.qr_code == qr_code, Bin.is_active == True).first()
    if not bin_obj:
        raise HTTPException(status_code=404, detail="Bin not found")
    return bin_obj


@router.get("/{bin_id}/qr-image")
def get_qr_image(bin_id: int, db: Session = Depends(get_db)):
    bin_obj = db.query(Bin).filter(Bin.id == bin_id).first()
    if not bin_obj:
        raise HTTPException(status_code=404, detail="Bin not found")

    frontend_base = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    url = f"{frontend_base}/scan?bin={bin_obj.qr_code}"
    img = qrcode.make(url)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")
