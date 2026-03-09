from fastapi import APIRouter

router = APIRouter()


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
