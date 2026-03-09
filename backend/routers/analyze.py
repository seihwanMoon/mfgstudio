import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.trained_model import TrainedModel
from services.pycaret_service import generate_plot_image, generate_shap_values

router = APIRouter()


class PlotRequest(BaseModel):
    model_id: int
    plot_type: str
    use_train_data: bool = False


class InterpretRequest(BaseModel):
    model_id: int
    row_index: int = 0


@router.post("/plot")
def get_plot(payload: PlotRequest, db: Session = Depends(get_db)):
    model = db.query(TrainedModel).filter(TrainedModel.id == payload.model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="모델을 찾을 수 없습니다")

    return {
        "model_id": model.id,
        "plot_type": payload.plot_type,
        "base64_image": generate_plot_image(payload.plot_type, model.algorithm),
        "image_format": "svg",
    }


@router.post("/interpret")
def interpret_model(payload: InterpretRequest, db: Session = Depends(get_db)):
    model = db.query(TrainedModel).filter(TrainedModel.id == payload.model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="모델을 찾을 수 없습니다")

    result = generate_shap_values(model.algorithm, payload.row_index)
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
