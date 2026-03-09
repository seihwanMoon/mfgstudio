import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.dataset import Dataset
from models.experiment import Experiment
from services.pycaret_service import run_setup

router = APIRouter()


class SetupRequest(BaseModel):
    dataset_id: int
    module_type: str
    params: dict
    experiment_name: str


@router.post("/setup")
def setup_experiment(req: SetupRequest, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="데이터셋을 찾을 수 없습니다")

    result = run_setup(
        dataset_path=dataset.stored_path,
        module_type=req.module_type,
        params=req.params,
        mlflow_experiment_name=req.experiment_name,
    )

    experiment = Experiment(
        name=req.experiment_name,
        dataset_id=req.dataset_id,
        module_type=req.module_type,
        target_col=req.params.get("target_col"),
        setup_params=json.dumps(req.params, ensure_ascii=False),
        mlflow_exp_id=result.get("mlflow_experiment_id"),
        mlflow_exp_name=req.experiment_name,
        status="setup",
    )
    db.add(experiment)
    db.commit()
    db.refresh(experiment)

    return {
        "experiment_id": experiment.id,
        "pipeline_steps": result.get("pipeline_steps", []),
        "transformed_shape": result.get("transformed_shape"),
    }


@router.get("/setup/{experiment_id}/code")
def get_setup_code(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="실험을 찾을 수 없습니다")

    params = json.loads(experiment.setup_params or "{}")
    module_imports = {
        "classification": "from pycaret.classification import *",
        "regression": "from pycaret.regression import *",
        "clustering": "from pycaret.clustering import *",
        "anomaly": "from pycaret.anomaly import *",
        "timeseries": "from pycaret.time_series import *",
    }
    lines = [
        "# PyCaret 3.0 - generated setup code",
        module_imports.get(experiment.module_type, module_imports["classification"]),
        "",
        "s = setup(",
        "    data=df,",
    ]
    if experiment.target_col:
        lines.append(f"    target='{experiment.target_col}',")
    for key, value in params.items():
        if key == "target_col":
            continue
        if isinstance(value, str):
            lines.append(f"    {key}='{value}',")
        else:
            lines.append(f"    {key}={value},")
    lines.append(")")
    return {"code": "\n".join(lines)}


@router.post("/compare")
def start_compare():
    return {"message": "Not implemented yet", "stream_url": None}


@router.get("/models")
def list_models():
    return {"models": []}
