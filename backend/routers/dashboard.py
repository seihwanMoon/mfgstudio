import json

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.prediction import Prediction
from services.model_catalog_service import get_catalog_entries

router = APIRouter()


def _get_dashboard_models(db: Session) -> list:
    return [entry["model"] for entry in get_catalog_entries(db)]


@router.get("/models")
def get_models(db: Session = Depends(get_db)):
    models = _get_dashboard_models(db)

    return [
        {
            "id": model.id,
            "algorithm": model.algorithm,
            "metrics": json.loads(model.metrics or "{}"),
            "stage": model.stage or "None",
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
    models = _get_dashboard_models(db)
    model_ids = [model.id for model in models]

    prediction_count = 0
    if model_ids:
        prediction_count = (
            db.query(func.count(Prediction.id))
            .filter(Prediction.model_id.in_(model_ids))
            .scalar()
            or 0
        )

    return {
        "active_model_count": len(models),
        "production_model_count": sum(1 for model in models if model.stage == "Production"),
        "staging_model_count": sum(1 for model in models if model.stage == "Staging"),
        "prediction_count_total": prediction_count,
        "alert_count": sum(1 for model in models if (model.drift_score or 0) >= 0.2),
    }
