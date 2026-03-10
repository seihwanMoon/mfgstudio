from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.trained_model import TrainedModel
from services.mlflow_service import get_all_registered_models

router = APIRouter()


class RegisterRequest(BaseModel):
    run_id: str
    model_name: str


class StageRequest(BaseModel):
    version: int
    stage: str


class RollbackRequest(BaseModel):
    version: int


@router.get("/models")
def list_registered_models(db: Session = Depends(get_db)):
    models = get_all_registered_models()
    if models:
        return models

    grouped = (
        db.query(TrainedModel.mlflow_model_name)
        .filter(
            TrainedModel.mlflow_model_name.isnot(None),
            TrainedModel.mlflow_version.isnot(None),
        )
        .distinct()
        .all()
    )
    results = []
    for (name,) in grouped:
        versions = (
            db.query(TrainedModel)
            .filter(
                TrainedModel.mlflow_model_name == name,
                TrainedModel.mlflow_version.isnot(None),
            )
            .order_by(TrainedModel.mlflow_version.desc())
            .all()
        )
        if not versions:
            continue
        production = next((item for item in versions if item.stage == "Production"), None)
        results.append(
            {
                "name": name,
                "description": "",
                "latest_versions": [item.mlflow_version for item in versions if item.mlflow_version is not None],
                "production_version": production.mlflow_version if production else None,
            }
        )
    return sorted(results, key=lambda item: (-(item["latest_versions"][0] or 0), item["name"]))


@router.post("/register")
def register_model(payload: RegisterRequest, db: Session = Depends(get_db)):
    model = db.query(TrainedModel).filter(TrainedModel.mlflow_run_id == payload.run_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="해당 run_id의 모델을 찾을 수 없습니다.")

    current_max = (
        db.query(func.max(TrainedModel.mlflow_version))
        .filter(TrainedModel.mlflow_model_name == payload.model_name)
        .scalar()
        or 0
    )
    model.mlflow_model_name = payload.model_name
    model.mlflow_version = int(current_max) + 1
    model.stage = model.stage or "None"
    db.commit()
    return {
        "name": payload.model_name,
        "version": model.mlflow_version,
        "run_id": payload.run_id,
    }


@router.get("/{model_name}/versions")
def get_versions(model_name: str, db: Session = Depends(get_db)):
    models = (
        db.query(TrainedModel)
        .filter(TrainedModel.mlflow_model_name == model_name)
        .order_by(TrainedModel.mlflow_version.desc())
        .all()
    )
    return [
        {
            "id": model.id,
            "version": model.mlflow_version,
            "stage": model.stage,
            "algorithm": model.algorithm,
            "metrics": model.metrics,
            "run_id": model.mlflow_run_id,
        }
        for model in models
    ]


@router.put("/{model_name}/stage")
def change_stage(model_name: str, payload: StageRequest, db: Session = Depends(get_db)):
    models = db.query(TrainedModel).filter(TrainedModel.mlflow_model_name == model_name).all()
    if not models:
        raise HTTPException(status_code=404, detail="등록된 모델이 없습니다.")

    target = next((model for model in models if model.mlflow_version == payload.version), None)
    if not target:
        raise HTTPException(status_code=404, detail="버전을 찾을 수 없습니다.")

    if payload.stage == "Production":
        for model in models:
            if model.id != target.id and model.stage == "Production":
                model.stage = "Archived"

    target.stage = payload.stage
    db.commit()
    return {"name": model_name, "version": payload.version, "stage": payload.stage}


@router.post("/{model_name}/rollback")
def rollback(model_name: str, payload: RollbackRequest, db: Session = Depends(get_db)):
    models = db.query(TrainedModel).filter(TrainedModel.mlflow_model_name == model_name).all()
    if not models:
        raise HTTPException(status_code=404, detail="등록된 모델이 없습니다.")

    target = next((model for model in models if model.mlflow_version == payload.version), None)
    if not target:
        raise HTTPException(status_code=404, detail="버전을 찾을 수 없습니다.")

    for model in models:
        if model.id != target.id and model.stage == "Production":
            model.stage = "Archived"
    target.stage = "Production"
    db.commit()
    return {"model_name": model_name, "restored_version": payload.version}
