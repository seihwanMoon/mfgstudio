import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.dataset import Dataset
from models.experiment import Experiment
from models.trained_model import TrainedModel
from services.pycaret_service import ensure_experiment_context, get_plot, get_shap

router = APIRouter()


class PlotRequest(BaseModel):
    model_id: int
    plot_type: str
    use_train_data: bool = False


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
    return {
        "model_id": model.id,
        "plot_type": payload.plot_type,
        "base64_image": get_plot(experiment.id, model.algorithm, payload.plot_type, payload.use_train_data),
        "image_format": "png",
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
    result = get_shap(experiment.id, model.algorithm, payload.row_index)
    return {"model_id": model.id, **result}


@router.get("/plots/list")
def list_plots(module_type: str = "classification"):
    plots = {
        "classification": ["auc", "confusion_matrix", "feature", "learning", "pr", "calibration"],
        "regression": ["residuals", "error", "cooks", "feature", "learning"],
        "clustering": ["cluster", "tsne", "elbow"],
        "anomaly": ["tsne", "umap"],
        "timeseries": ["forecast", "residuals", "acf", "pacf"],
    }
    return {"module_type": module_type, "plots": plots.get(module_type, [])}
