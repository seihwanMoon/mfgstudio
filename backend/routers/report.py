from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from models.trained_model import TrainedModel
from services.report_service import generate_model_report, resolve_report_path

router = APIRouter()


def _get_model(db: Session, model_id: int) -> TrainedModel:
    model = db.query(TrainedModel).filter(TrainedModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model


@router.get("/{model_id}/meta")
def get_report_meta(model_id: int, db: Session = Depends(get_db)):
    model = _get_model(db, model_id)
    report_path = resolve_report_path(model)
    return {
        "model_id": model.id,
        "report_path": str(report_path),
        "report_filename": report_path.name,
        "report_exists": report_path.exists(),
        "report_download_url": f"/api/report/{model.id}",
    }


@router.post("/{model_id}/generate")
def create_report(model_id: int, force: bool = Query(default=True), db: Session = Depends(get_db)):
    model = _get_model(db, model_id)
    return generate_model_report(db, model, force=force)


@router.get("/{model_id}")
def download_report(model_id: int, force: bool = Query(default=False), db: Session = Depends(get_db)):
    model = _get_model(db, model_id)
    report_meta = generate_model_report(db, model, force=force)
    report_path = resolve_report_path(model)
    return FileResponse(
        path=report_path,
        media_type="application/pdf",
        filename=report_meta["report_filename"],
    )
