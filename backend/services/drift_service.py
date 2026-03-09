import json
import random

from sqlalchemy.orm import Session

from models.trained_model import TrainedModel


def _primary_metric(metrics: dict) -> float:
    for key in ("Accuracy", "AUC", "F1", "R2", "Score"):
        value = metrics.get(key)
        if isinstance(value, (int, float)):
            return float(value)
    return 0.0


def calculate_drift_score(model: TrainedModel) -> float:
    metrics = json.loads(model.metrics or "{}")
    primary_metric = _primary_metric(metrics)
    prediction_pressure = min((model.pred_count_total or 0) / 250.0, 0.35)
    performance_penalty = max(0.0, 0.2 - max(primary_metric - 0.8, 0.0))
    seeded_noise = random.Random(
        f"{model.mlflow_model_name}:{model.mlflow_version}:{model.pred_count_total}"
    ).uniform(0.01, 0.09)
    score = min(0.95, prediction_pressure + performance_penalty + seeded_noise)
    return round(score, 4)


def refresh_model_drift(db: Session, model: TrainedModel) -> dict:
    model.drift_score = calculate_drift_score(model)
    db.add(model)
    db.commit()
    db.refresh(model)
    return {
        "id": model.id,
        "model_name": model.mlflow_model_name,
        "version": model.mlflow_version,
        "stage": model.stage,
        "drift_score": model.drift_score,
    }


def refresh_production_drifts(db: Session) -> list[dict]:
    models = db.query(TrainedModel).filter(TrainedModel.stage == "Production").all()
    results = []
    for model in models:
        model.drift_score = calculate_drift_score(model)
        db.add(model)
        results.append(
            {
                "id": model.id,
                "model_name": model.mlflow_model_name,
                "version": model.mlflow_version,
                "stage": model.stage,
                "drift_score": model.drift_score,
            }
        )
    db.commit()
    return results
