import json
import shutil
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.dataset import Dataset
from models.experiment import Experiment
from models.prediction import Prediction
from models.trained_model import TrainedModel
from services.pycaret_service import predict_batch_rows, predict_payload

router = APIRouter()

STAGE_PRIORITY = {
    "Production": 0,
    "Staging": 1,
    "None": 2,
    "Archived": 3,
    None: 4,
}


class SinglePredictRequest(BaseModel):
    input_data: dict
    threshold: float = 0.5


def _sanitize_label(value: str) -> str:
    return " ".join(str(value).replace("\t", " ").replace("\n", " ").split())


def _get_predictable_versions(db: Session, model_name: str | None = None) -> list[TrainedModel]:
    query = (
        db.query(TrainedModel)
        .filter(TrainedModel.model_path.isnot(None), TrainedModel.mlflow_model_name.isnot(None))
    )
    if model_name:
        query = query.filter(TrainedModel.mlflow_model_name == model_name)
    return query.all()


def _pick_preferred_model(models: list[TrainedModel]) -> TrainedModel | None:
    if not models:
        return None
    return sorted(
        models,
        key=lambda model: (
            STAGE_PRIORITY.get(model.stage, 99),
            -(model.mlflow_version or 0),
            -model.id,
        ),
    )[0]


def _build_schema(db: Session, model: TrainedModel) -> dict:
    experiment = db.query(Experiment).filter(Experiment.id == model.experiment_id).first()
    dataset = db.query(Dataset).filter(Dataset.id == experiment.dataset_id).first() if experiment else None
    if not experiment or not dataset:
        return {"module_type": "classification", "columns": []}

    columns = []
    for item in json.loads(dataset.col_meta or "[]"):
        if item.get("name") == experiment.target_col:
            continue
        columns.append(
            {
                "name": item.get("name"),
                "label": _sanitize_label(item.get("name")),
                "type": item.get("type") or "categorical",
            }
        )

    return {
        "module_type": experiment.module_type,
        "target_col": experiment.target_col,
        "columns": columns,
    }


def _get_predict_model(db: Session, model_name: str) -> TrainedModel:
    model = _pick_preferred_model(_get_predictable_versions(db, model_name))
    if not model:
        raise HTTPException(status_code=404, detail="예측 가능한 모델을 찾을 수 없습니다.")
    return model


@router.get("/models")
def list_predict_models(db: Session = Depends(get_db)):
    versions = _get_predictable_versions(db)
    grouped: dict[str, list[TrainedModel]] = {}
    for model in versions:
        grouped.setdefault(model.mlflow_model_name, []).append(model)

    results = []
    for name, models in grouped.items():
        preferred = _pick_preferred_model(models)
        if not preferred:
            continue
        schema = _build_schema(db, preferred)
        results.append(
            {
                "name": name,
                "display_name": _sanitize_label(name),
                "stage": preferred.stage or "None",
                "version": preferred.mlflow_version,
                "algorithm": preferred.algorithm,
                "module_type": schema["module_type"],
                "is_production": (preferred.stage or "") == "Production",
                "selected_model_id": preferred.id,
            }
        )

    results.sort(
        key=lambda item: (
            -item["selected_model_id"],
            STAGE_PRIORITY.get(item["stage"], 99),
            -(item["version"] or 0),
            item["name"],
        )
    )
    return results


@router.get("/models/{model_name}/schema")
def get_predict_model_schema(model_name: str, db: Session = Depends(get_db)):
    model = _get_predict_model(db, model_name)
    schema = _build_schema(db, model)
    return {
        "name": model.mlflow_model_name,
        "display_name": _sanitize_label(model.mlflow_model_name),
        "stage": model.stage or "None",
        "version": model.mlflow_version,
        "algorithm": model.algorithm,
        **schema,
    }


@router.post("/{model_name}")
def predict_single(model_name: str, payload: SinglePredictRequest, db: Session = Depends(get_db)):
    model = _get_predict_model(db, model_name)
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
    model = _get_predict_model(db, model_name)
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
