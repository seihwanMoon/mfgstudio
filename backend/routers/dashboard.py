import json

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.prediction import Prediction
from models.trained_model import TrainedModel

router = APIRouter()


@router.get("/models")
def get_models(db: Session = Depends(get_db)):
    models = (
        db.query(TrainedModel)
        .filter(TrainedModel.stage == "Production")
        .order_by(TrainedModel.updated_at.desc())
        .all()
    )

    return [
        {
            "id": model.id,
            "algorithm": model.algorithm,
            "metrics": json.loads(model.metrics or "{}"),
            "stage": model.stage,
            "drift_score": model.drift_score,
            "pred_count_total": model.pred_count_total,
            "pred_count_today": model.pred_count_today,
            "mlflow_model_name": model.mlflow_model_name,
            "mlflow_version": model.mlflow_version,
            "updated_at": model.updated_at.isoformat() if model.updated_at else None,
        }
        for model in models
    ]


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    model_count = db.query(func.count(TrainedModel.id)).filter(TrainedModel.stage == "Production").scalar() or 0
    prediction_count = db.query(func.count(Prediction.id)).scalar() or 0
    alert_count = db.query(func.count(TrainedModel.id)).filter(TrainedModel.drift_score >= 0.2).scalar() or 0

    return {
        "production_model_count": model_count,
        "prediction_count_total": prediction_count,
        "alert_count": alert_count,
    }
