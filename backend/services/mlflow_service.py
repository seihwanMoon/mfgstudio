import socket
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

import mlflow
import mlflow.sklearn
from mlflow.entities.model_registry.model_version_status import ModelVersionStatus
from mlflow.exceptions import MlflowException
from mlflow.tracking import MlflowClient

from config import settings

VISIBLE_RUN_PREFIXES = ("compare::", "tune::", "blend::", "stack::", "automl::", "finalize::", "backfill::")
VISIBLE_ARTIFACT_SOURCES = {
    "compare_models",
    "tune_model",
    "blend_models",
    "stack_models",
    "automl",
    "finalize_model",
    "backfill",
}


def _configure_tracking() -> None:
    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)


def _tracking_server_healthcheck(timeout_seconds: float = 1.0) -> tuple[bool, str | None]:
    parsed = urlparse(settings.mlflow_tracking_uri)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return True, None
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        with socket.create_connection((parsed.hostname, port), timeout=timeout_seconds):
            return True, None
    except OSError as exc:
        return False, str(exc)


def _require_tracking_server() -> None:
    reachable, error = _tracking_server_healthcheck()
    if not reachable:
        raise ConnectionError(f"MLflow tracking server is unreachable at {settings.mlflow_tracking_uri}: {error}")


def get_client() -> MlflowClient:
    _configure_tracking()
    return MlflowClient()


def close_active_runs(status: str = "FINISHED", limit: int = 10) -> list[str]:
    reachable, _ = _tracking_server_healthcheck()
    if not reachable:
        return []
    _configure_tracking()
    closed_run_ids = []
    for _ in range(limit):
        active = mlflow.active_run()
        if active is None:
            break
        closed_run_ids.append(active.info.run_id)
        mlflow.end_run(status=status)
    return closed_run_ids


def terminate_recent_running_runs(
    experiment_id: str,
    started_after_ms: int,
    keep_run_ids: set[str] | None = None,
    max_results: int = 100,
) -> list[str]:
    reachable, _ = _tracking_server_healthcheck()
    if not reachable:
        return []
    client = get_client()
    keep_run_ids = keep_run_ids or set()
    terminated = []
    runs = client.search_runs(
        experiment_ids=[str(experiment_id)],
        max_results=max_results,
        order_by=["attribute.start_time DESC"],
    )
    for run in runs:
        if run.info.status != "RUNNING":
            continue
        if run.info.run_id in keep_run_ids:
            continue
        if not run.info.start_time or run.info.start_time < started_after_ms:
            continue
        client.set_terminated(run.info.run_id, status="FINISHED")
        terminated.append(run.info.run_id)
    return terminated


def terminate_running_runs_by_name(
    experiment_id: str,
    run_names: set[str],
    max_results: int = 200,
) -> list[str]:
    if not run_names:
        return []
    reachable, _ = _tracking_server_healthcheck()
    if not reachable:
        return []
    client = get_client()
    terminated = []
    runs = client.search_runs(
        experiment_ids=[str(experiment_id)],
        max_results=max_results,
        order_by=["attribute.start_time DESC"],
    )
    for run in runs:
        if run.info.status != "RUNNING":
            continue
        current_name = run.data.tags.get("mlflow.runName") or ""
        if current_name not in run_names:
            continue
        client.set_terminated(run.info.run_id, status="FINISHED")
        terminated.append(run.info.run_id)
    return terminated


def ensure_experiment(experiment_name: str) -> str:
    reachable, _ = _tracking_server_healthcheck()
    if not reachable:
        return experiment_name
    client = get_client()
    experiment = client.get_experiment_by_name(experiment_name)
    if experiment:
        return experiment.experiment_id
    return client.create_experiment(experiment_name)


def get_mlflow_status() -> dict:
    try:
        reachable, error = _tracking_server_healthcheck()
        if not reachable:
            raise ConnectionError(error)
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


def _is_user_visible_run(run) -> bool:
    run_name = run.data.tags.get("mlflow.runName") or ""
    artifact_source = run.data.tags.get("artifact_source") or ""
    return run_name.startswith(VISIBLE_RUN_PREFIXES) or artifact_source in VISIBLE_ARTIFACT_SOURCES


def _dedupe_runs_by_name(runs) -> list:
    seen = set()
    rows = []
    for run in runs:
        run_name = run.data.tags.get("mlflow.runName") or run.info.run_id
        if run_name in seen:
            continue
        seen.add(run_name)
        rows.append(run)
    return rows


def list_experiments() -> list[dict]:
    client = get_client()
    experiments = client.search_experiments()
    payload = []
    for experiment in experiments:
        raw_runs = client.search_runs(
            experiment_ids=[experiment.experiment_id],
            max_results=100,
            order_by=["attribute.start_time DESC"],
        )
        runs = _dedupe_runs_by_name([run for run in raw_runs if _is_user_visible_run(run)])
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
                "latest_metrics": (
                    {key: round(float(value), 4) for key, value in latest_run.data.metrics.items()}
                    if latest_run
                    else {}
                ),
            }
        )
    return sorted(payload, key=lambda item: ((item["latest_start_time"] or ""), item["name"]), reverse=True)


def list_experiment_runs(experiment_id: str, max_results: int = 20) -> list[dict]:
    client = get_client()
    raw_runs = client.search_runs(
        experiment_ids=[experiment_id],
        max_results=max_results * 10,
        order_by=["attribute.start_time DESC"],
    )
    runs = _dedupe_runs_by_name([run for run in raw_runs if _is_user_visible_run(run)])[:max_results]
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
    try:
        _configure_tracking()
        experiment_id = ensure_experiment(experiment_name)
        close_active_runs()
        with mlflow.start_run(
            experiment_id=experiment_id,
            run_name=run_name,
            nested=False,
        ) as run:
            if tags:
                mlflow.set_tags({key: str(value) for key, value in tags.items() if value is not None})
            payload_params = _jsonable_params(params)
            payload_metrics = _jsonable_metrics(metrics)
            if payload_params:
                mlflow.log_params(payload_params)
            if payload_metrics:
                mlflow.log_metrics(payload_metrics)
            mlflow.sklearn.log_model(model, artifact_path="model", input_example=input_example)
        current = get_client().get_run(run.info.run_id)
        if current.info.status == "RUNNING":
            get_client().set_terminated(run.info.run_id, status="FINISHED")
        return {
            "run_id": run.info.run_id,
            "experiment_id": experiment_id,
            "mlflow_synced": True,
            "mlflow_error": None,
        }
    except Exception as exc:
        return {
            "run_id": f"local-{int(time.time() * 1000)}",
            "experiment_id": experiment_name,
            "mlflow_synced": False,
            "mlflow_error": str(exc),
        }


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
    _require_tracking_server()
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
    _require_tracking_server()
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


def delete_model_version(model_name: str, version: int) -> dict:
    _require_tracking_server()
    client = get_client()
    client.delete_model_version(name=model_name, version=str(version))
    remaining = client.search_model_versions(f"name='{model_name}'")
    remaining_versions = [int(item.version) for item in remaining if item.version is not None]
    if not remaining_versions:
        try:
            client.delete_registered_model(model_name)
        except Exception:
            pass
    return {
        "name": model_name,
        "deleted_version": int(version),
        "remaining_versions": sorted(remaining_versions, reverse=True),
    }


def get_registered_versions(model_name: str) -> list[dict]:
    _require_tracking_server()
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
