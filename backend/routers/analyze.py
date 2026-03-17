import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.dataset import Dataset
from models.experiment import Experiment
from models.trained_model import TrainedModel
from services.pycaret_service import (
    ensure_experiment_context,
    get_interpret_plot,
    get_plot,
    get_shap,
    get_xai_policy_matrix_row,
    list_plot_options,
)

router = APIRouter()


class PlotRequest(BaseModel):
    model_id: int
    plot_type: str
    plot_family: str = "plot"
    use_train_data: bool = False
    row_index: int = 0


class InterpretRequest(BaseModel):
    model_id: int
    row_index: int = 0


@router.post("/plot")
def get_plot_view(payload: PlotRequest, db: Session = Depends(get_db)):
    model = db.query(TrainedModel).filter(TrainedModel.id == payload.model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    experiment = db.query(Experiment).filter(Experiment.id == model.experiment_id).first()
    dataset = db.query(Dataset).filter(Dataset.id == experiment.dataset_id).first() if experiment else None
    if not experiment or not dataset:
        raise HTTPException(status_code=404, detail="Experiment or dataset not found")

    params = json.loads(experiment.setup_params or "{}")
    ensure_experiment_context(
        experiment_id=experiment.id,
        dataset_path=dataset.stored_path,
        module_type=experiment.module_type,
        params=params,
        experiment_name=experiment.name,
    )
    try:
        plot_payload = (
            get_interpret_plot(
                experiment.id,
                model.algorithm,
                payload.plot_type,
                payload.use_train_data,
                payload.row_index,
            )
            if payload.plot_family == "xai"
            else get_plot(experiment.id, model.algorithm, payload.plot_type, payload.use_train_data)
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"analyze plot failed: {exc}") from exc

    if isinstance(plot_payload, str):
        plot_payload = {
            "render_mode": "image",
            "base64_image": plot_payload,
            "image_format": "png",
        }

    return {
        "model_id": model.id,
        "plot_type": payload.plot_type,
        "plot_family": payload.plot_family,
        **plot_payload,
    }


@router.post("/interpret")
def interpret_model(payload: InterpretRequest, db: Session = Depends(get_db)):
    model = db.query(TrainedModel).filter(TrainedModel.id == payload.model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    experiment = db.query(Experiment).filter(Experiment.id == model.experiment_id).first()
    dataset = db.query(Dataset).filter(Dataset.id == experiment.dataset_id).first() if experiment else None
    if not experiment or not dataset:
        raise HTTPException(status_code=404, detail="Experiment or dataset not found")

    params = json.loads(experiment.setup_params or "{}")
    ensure_experiment_context(
        experiment_id=experiment.id,
        dataset_path=dataset.stored_path,
        module_type=experiment.module_type,
        params=params,
        experiment_name=experiment.name,
    )
    try:
        result = get_shap(experiment.id, model.algorithm, payload.row_index)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"model_id": model.id, **result}


@router.get("/plots/list")
def list_plots(module_type: str = "classification", algorithm: str | None = None, experiment_id: int | None = None):
    return list_plot_options(module_type, algorithm, experiment_id)


@router.get("/xai/matrix")
def get_xai_matrix(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    models = (
        db.query(TrainedModel)
        .filter(TrainedModel.experiment_id == experiment_id)
        .order_by(TrainedModel.updated_at.desc(), TrainedModel.id.desc())
        .all()
    )
    rows = []
    for model in models:
        matrix_row = get_xai_policy_matrix_row(experiment.module_type, experiment_id, model.algorithm)
        rows.append(
            {
                "model_id": model.id,
                "algorithm": model.algorithm,
                "is_tuned": bool(model.is_tuned),
                "stage": model.stage or "None",
                "updated_at": model.updated_at.isoformat() if model.updated_at else None,
                **matrix_row,
            }
        )

    return {
        "experiment_id": experiment_id,
        "module_type": experiment.module_type,
        "rows": rows,
    }
