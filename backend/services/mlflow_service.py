import time
from datetime import datetime, timezone
from typing import Any

import mlflow
import mlflow.sklearn
from mlflow.entities.model_registry.model_version_status import ModelVersionStatus
from mlflow.exceptions import MlflowException
from mlflow.tracking import MlflowClient

from config import settings


def _configure_tracking() -> None:
    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)


def get_client() -> MlflowClient:
    _configure_tracking()
    return MlflowClient()


def ensure_experiment(experiment_name: str) -> str:
    client = get_client()
    experiment = client.get_experiment_by_name(experiment_name)
    if experiment:
        return experiment.experiment_id
    return client.create_experiment(experiment_name)


def get_mlflow_status() -> dict:
    try:
        client = get_client()
        experiments = client.search_experiments()
        models = list(client.search_registered_models())
        return {
            "status": "connected",
            "uri": settings.mlflow_tracking_uri,
            "experiment_count": len(experiments),
            "registered_model_count": len(models),
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
            versions = client.search_model_versions(f"name='{registered.name}'")
            all_versions = sorted(
                [int(version.version) for version in versions if version.version is not None],
                reverse=True,
            )
            production = next((version for version in versions if getattr(version, "current_stage", None) == "Production"), None)
            models.append(
                {
                    "name": registered.name,
                    "description": registered.description or "",
                    "latest_versions": all_versions,
                    "production_version": int(production.version) if production else None,
                }
            )
        return sorted(models, key=lambda item: (-(item["latest_versions"][0] or 0), item["name"]))
    except Exception:
        return []


def _ts_to_iso(timestamp_ms: int | None) -> str | None:
    if not timestamp_ms:
        return None
    return datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc).isoformat()


def list_experiments() -> list[dict]:
    client = get_client()
    experiments = client.search_experiments()
    payload = []
    for experiment in experiments:
        runs = client.search_runs(
            experiment_ids=[experiment.experiment_id],
            max_results=20,
            order_by=["attribute.start_time DESC"],
        )
        latest_run = runs[0] if runs else None
        payload.append(
            {
                "experiment_id": experiment.experiment_id,
                "name": experiment.name,
                "lifecycle_stage": experiment.lifecycle_stage,
                "run_count": len(runs),
                "last_update_time": _ts_to_iso(getattr(experiment, "last_update_time", None)),
                "latest_run_id": latest_run.info.run_id if latest_run else None,
                "latest_run_name": latest_run.data.tags.get("mlflow.runName") if latest_run else None,
                "latest_run_status": latest_run.info.status if latest_run else None,
                "latest_start_time": _ts_to_iso(latest_run.info.start_time) if latest_run else None,
            }
        )
    return sorted(payload, key=lambda item: ((item["latest_start_time"] or ""), item["name"]), reverse=True)


def list_experiment_runs(experiment_id: str, max_results: int = 20) -> list[dict]:
    client = get_client()
    runs = client.search_runs(
        experiment_ids=[experiment_id],
        max_results=max_results,
        order_by=["attribute.start_time DESC"],
    )
    payload = []
    for run in runs:
        metrics = {key: round(float(value), 4) for key, value in run.data.metrics.items()}
        payload.append(
            {
                "run_id": run.info.run_id,
                "run_name": run.data.tags.get("mlflow.runName") or run.info.run_id[:8],
                "status": run.info.status,
                "start_time": _ts_to_iso(run.info.start_time),
                "end_time": _ts_to_iso(run.info.end_time),
                "metrics": metrics,
                "params": dict(run.data.params),
                "tags": dict(run.data.tags),
            }
        )
    return payload


def _jsonable_params(params: dict[str, Any] | None) -> dict[str, Any]:
    if not params:
        return {}
    payload = {}
    for key, value in params.items():
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            payload[key] = value
        else:
            payload[key] = str(value)
    return payload


def _jsonable_metrics(metrics: dict[str, Any] | None) -> dict[str, float]:
    if not metrics:
        return {}
    payload = {}
    for key, value in metrics.items():
        try:
            payload[key] = float(value)
        except (TypeError, ValueError):
            continue
    return payload


def log_sklearn_model_run(
    *,
    experiment_name: str,
    run_name: str,
    model: Any,
    metrics: dict[str, Any] | None = None,
    params: dict[str, Any] | None = None,
    tags: dict[str, Any] | None = None,
    input_example: Any = None,
) -> dict:
    _configure_tracking()
    experiment_id = ensure_experiment(experiment_name)
    with mlflow.start_run(experiment_id=experiment_id, run_name=run_name) as run:
        if tags:
            mlflow.set_tags({key: str(value) for key, value in tags.items() if value is not None})
        payload_params = _jsonable_params(params)
        payload_metrics = _jsonable_metrics(metrics)
        if payload_params:
            mlflow.log_params(payload_params)
        if payload_metrics:
            mlflow.log_metrics(payload_metrics)
        mlflow.sklearn.log_model(model, artifact_path="model", input_example=input_example)
        return {"run_id": run.info.run_id, "experiment_id": experiment_id}


def _wait_for_model_version(model_name: str, version: int, timeout_seconds: int = 30) -> None:
    client = get_client()
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        current = client.get_model_version(name=model_name, version=str(version))
        status = ModelVersionStatus.from_string(current.status)
        if status == ModelVersionStatus.READY:
            return
        time.sleep(1)
    raise TimeoutError(f"MLflow model version did not become READY: {model_name} v{version}")


def register_run_model(model_name: str, run_id: str, description: str = "") -> dict:
    client = get_client()
    try:
        client.get_registered_model(model_name)
    except MlflowException:
        client.create_registered_model(model_name, description=description or None)

    model_uri = f"runs:/{run_id}/model"
    registered = mlflow.register_model(model_uri=model_uri, name=model_name)
    version = int(registered.version)
    _wait_for_model_version(model_name, version)
    return {"name": model_name, "version": version, "run_id": run_id}


def transition_model_stage(model_name: str, version: int, stage: str) -> dict:
    client = get_client()
    archive_existing = stage == "Production"
    client.transition_model_version_stage(
        name=model_name,
        version=str(version),
        stage=stage,
        archive_existing_versions=archive_existing,
    )
    current = client.get_model_version(name=model_name, version=str(version))
    return {"name": model_name, "version": int(current.version), "stage": current.current_stage}


def get_registered_versions(model_name: str) -> list[dict]:
    client = get_client()
    versions = client.search_model_versions(f"name='{model_name}'")
    payload = []
    for version in versions:
        payload.append(
            {
                "name": version.name,
                "version": int(version.version),
                "stage": version.current_stage,
                "run_id": version.run_id,
            }
        )
    return sorted(payload, key=lambda item: -item["version"])
