from fastapi import APIRouter, HTTPException, Query

from services.mlflow_service import get_mlflow_status, list_experiment_runs, list_experiments

router = APIRouter()


@router.get("/status")
def mlflow_status():
    return get_mlflow_status()


@router.get("/experiments")
def get_experiments():
    try:
        return {"experiments": list_experiments()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch MLflow experiments: {exc}") from exc


@router.get("/experiments/{experiment_id}/runs")
def get_experiment_runs(experiment_id: str, limit: int = Query(20, ge=1, le=100)):
    try:
        return {"runs": list_experiment_runs(experiment_id, max_results=limit)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch MLflow runs: {exc}") from exc
