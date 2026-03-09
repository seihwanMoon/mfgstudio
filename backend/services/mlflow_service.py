import mlflow
from mlflow.tracking import MlflowClient

from config import settings


def get_client() -> MlflowClient:
    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
    return MlflowClient()


def get_mlflow_status() -> dict:
    try:
        client = get_client()
        experiments = client.search_experiments()
        return {
            "status": "connected",
            "uri": settings.mlflow_tracking_uri,
            "experiment_count": len(experiments),
        }
    except Exception as exc:
        return {
            "status": "disconnected",
            "uri": settings.mlflow_tracking_uri,
            "error": str(exc),
        }


def get_all_registered_models() -> list[dict]:
    try:
        client = get_client()
        models = []
        for registered in client.search_registered_models():
            models.append(
                {
                    "name": registered.name,
                    "description": registered.description or "",
                    "latest_versions": [version.version for version in registered.latest_versions],
                }
            )
        return models
    except Exception:
        return []
