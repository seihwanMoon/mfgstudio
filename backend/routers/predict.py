import json
import shutil
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.experiment import Experiment
from models.prediction import Prediction
from models.trained_model import TrainedModel
from services.pycaret_service import predict_batch_rows, predict_payload

router = APIRouter()


class SinglePredictRequest(BaseModel):
    input_data: dict
    threshold: float = 0.5


def _get_production_model(db: Session, model_name: str) -> TrainedModel:
    model = (
        db.query(TrainedModel)
        .filter(TrainedModel.mlflow_model_name == model_name)
        .order_by(TrainedModel.mlflow_version.desc())
        .first()
    )
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    if not model.model_path:
        raise HTTPException(status_code=400, detail="Model is not finalized yet")
    return model


@router.post("/{model_name}")
def predict_single(model_name: str, payload: SinglePredictRequest, db: Session = Depends(get_db)):
    model = _get_production_model(db, model_name)
    experiment = db.query(Experiment).filter(Experiment.id == model.experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    result = predict_payload(model.model_path, experiment.module_type, payload.input_data, payload.threshold)

    db.add(
        Prediction(
            model_id=model.id,
            model_name=model_name,
            source="manual",
            input_data=json.dumps(payload.input_data, ensure_ascii=False),
            label=result["label"],
            score=result.get("score"),
            threshold=payload.threshold,
        )
    )
    model.pred_count_total += 1
    model.pred_count_today += 1
    db.commit()
    return result


@router.post("/{model_name}/batch")
async def predict_batch(
    model_name: str,
    threshold: float = 0.5,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    model = _get_production_model(db, model_name)
    experiment = db.query(Experiment).filter(Experiment.id == model.experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    tmp_path = Path(settings.upload_dir) / f"batch_{file.filename}"
    with tmp_path.open("wb") as target:
        shutil.copyfileobj(file.file, target)

    try:
        df = pd.read_csv(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)

    results = predict_batch_rows(model.model_path, experiment.module_type, df.to_dict("records"), threshold)
    db.add(
        Prediction(
            model_id=model.id,
            model_name=model_name,
            source="batch",
            input_data=json.dumps({"rows": len(results)}, ensure_ascii=False),
            label=f"batch:{len(results)}",
            score=None,
            threshold=threshold,
        )
    )
    model.pred_count_total += len(results)
    model.pred_count_today += len(results)
    db.commit()
    return {"results": results, "total": len(results)}


@router.get("/history")
def get_history(limit: int = 100, db: Session = Depends(get_db)):
    rows = db.query(Prediction).order_by(Prediction.created_at.desc()).limit(limit).all()
    return [
        {
            "id": row.id,
            "model_name": row.model_name,
            "source": row.source,
            "label": row.label,
            "score": row.score,
            "threshold": row.threshold,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


@router.get("/history/{model_name}")
def get_model_history(model_name: str, limit: int = 100, db: Session = Depends(get_db)):
    rows = (
        db.query(Prediction)
        .filter(Prediction.model_name == model_name)
        .order_by(Prediction.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": row.id,
            "model_name": row.model_name,
            "source": row.source,
            "label": row.label,
            "score": row.score,
            "threshold": row.threshold,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]
