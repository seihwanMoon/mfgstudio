from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.trained_model import TrainedModel
from services.report_service import build_report_context, render_report_pdf

router = APIRouter()


@router.get("/{model_id}")
def download_report(model_id: int, db: Session = Depends(get_db)):
    model = db.query(TrainedModel).filter(TrainedModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    context = build_report_context(model)
    report_bytes = render_report_pdf(context)
    report_path = Path(settings.report_dir) / f"model_report_{model_id}.pdf"
    report_path.write_bytes(report_bytes)
    return FileResponse(
        path=report_path,
        media_type="application/pdf",
        filename=report_path.name,
    )
