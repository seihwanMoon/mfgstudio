from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.trained_model import TrainedModel
from services.drift_service import refresh_model_drift

router = APIRouter()


@router.post("/check/{model_name}")
def check_model_drift(model_name: str, db: Session = Depends(get_db)):
    model = (
        db.query(TrainedModel)
        .filter(TrainedModel.mlflow_model_name == model_name)
        .order_by(TrainedModel.mlflow_version.desc())
        .first()
    )
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return refresh_model_drift(db, model)
