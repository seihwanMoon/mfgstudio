import shutil
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.dataset import Dataset
from models.experiment import Experiment
from models.prediction import Prediction
from models.trained_model import TrainedModel
from services.artifact_cache import cleanup_cache_tree, retention_seconds, summarize_cache_directory
from services.mlflow_service import (
    delete_mlflow_experiment,
    delete_model_version,
    delete_registered_model_name,
    list_experiment_refs,
    list_registered_model_refs,
    transition_model_stage,
)
from services.pycaret_service import EXPERIMENT_CONTEXTS
from services.report_service import resolve_report_path

router = APIRouter()


def _experiment_dir(experiment_id: int) -> Path:
    return Path(settings.experiment_dir) / f"experiment_{experiment_id}"


def _report_chart_cache_dir(model_id: int) -> Path:
    return Path(settings.report_dir) / "chart_cache" / f"model_{model_id}"


def _xai_snapshot_cache_dir(experiment_id: int, algorithm: str) -> Path:
    slug = "".join(char.lower() if char.isalnum() else "_" for char in str(algorithm))
    normalized = "_".join(part for part in slug.split("_") if part) or "model"
    return Path(settings.report_dir) / "xai_cache" / f"experiment_{experiment_id}" / normalized


def _cache_status_payload() -> dict:
    report_chart_root = Path(settings.report_dir) / "chart_cache"
    xai_snapshot_root = Path(settings.report_dir) / "xai_cache"
    return {
        "policy": {
            "report_chart_cache_retention_days": settings.report_chart_cache_retention_days,
            "xai_snapshot_cache_retention_days": settings.xai_snapshot_cache_retention_days,
            "report_chart_cache_dir": str(report_chart_root),
            "xai_snapshot_cache_dir": str(xai_snapshot_root),
        },
        "report_chart_cache": summarize_cache_directory(report_chart_root, recursive=True),
        "xai_snapshot_cache": summarize_cache_directory(xai_snapshot_root, recursive=True),
    }


def _linked_mlflow_references(db: Session) -> dict[str, set[str]]:
    experiments = db.query(Experiment).all()
    models = db.query(TrainedModel).all()
    return {
        "experiment_ids": {str(row.mlflow_exp_id) for row in experiments if row.mlflow_exp_id},
        "experiment_names": {str(row.mlflow_exp_name or row.name) for row in experiments if row.mlflow_exp_name or row.name},
        "model_names": {str(row.mlflow_model_name) for row in models if row.mlflow_model_name},
        "run_ids": {
            str(row.mlflow_run_id)
            for row in models
            if row.mlflow_run_id and not str(row.mlflow_run_id).startswith("local-")
        },
    }


def _list_mlflow_orphans(db: Session) -> dict:
    refs = _linked_mlflow_references(db)
    orphan_experiments = []
    for experiment in list_experiment_refs():
        experiment_id = str(experiment.get("experiment_id"))
        experiment_name = str(experiment.get("name") or "")
        if experiment_name == "Default":
            continue
        if experiment_id in refs["experiment_ids"] or experiment_name in refs["experiment_names"]:
            continue
        orphan_experiments.append(experiment)

    orphan_models = []
    for model in list_registered_model_refs():
        model_name = str(model.get("name") or "")
        if model_name in refs["model_names"]:
            continue
        orphan_models.append(model)

    return {
        "experiments": orphan_experiments,
        "registered_models": orphan_models,
        "counts": {
            "experiments": len(orphan_experiments),
            "registered_models": len(orphan_models),
        },
    }


def _prediction_counts(db: Session) -> dict[int, int]:
    rows = db.query(Prediction.model_id, func.count(Prediction.id)).group_by(Prediction.model_id).all()
    return {int(model_id): int(count) for model_id, count in rows}


def _compose_delete_blockers(
    *,
    has_finalized_model: bool,
    has_registered_version: bool,
    has_operational_stage: bool,
    prediction_count: int,
) -> list[str]:
    blockers: list[str] = []
    if has_finalized_model:
        blockers.append("finalize된 모델이 있습니다")
    if has_registered_version:
        blockers.append("레지스트리에 등록된 버전이 있습니다")
    if has_operational_stage:
        blockers.append("운영 스테이지 모델이 있습니다")
    if prediction_count > 0:
        blockers.append("예측 이력이 있습니다")
    return blockers


def _experiment_delete_blockers(models: list[TrainedModel], prediction_count: int) -> list[str]:
    return _compose_delete_blockers(
        has_finalized_model=any(model.model_path for model in models),
        has_registered_version=any(model.mlflow_version is not None for model in models),
        has_operational_stage=any((model.stage or "") in {"Production", "Staging"} for model in models),
        prediction_count=prediction_count,
    )


def _remove_model_from_context_metadata(experiment_id: int, algorithm: str) -> None:
    context_path = _experiment_dir(experiment_id) / "context.json"
    if not context_path.exists():
        return
    try:
        import json

        payload = json.loads(context_path.read_text(encoding="utf-8"))
        persisted = payload.get("persisted_models", {})
        changed = False
        for bucket in ("trained", "tuned", "final"):
            bucket_map = persisted.get(bucket, {})
            if algorithm in bucket_map:
                bucket_map.pop(algorithm, None)
                changed = True
        if changed:
            context_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        return


def _build_retirement_plan(model: TrainedModel, prediction_count: int, report_exists: bool) -> dict:
    actions: list[str] = []
    skipped: list[str] = []

    archive_stage = (model.stage or "") != "Archived"
    if archive_stage:
        actions.append("스테이지를 Archived로 변경")
    else:
        skipped.append("스테이지가 이미 Archived입니다")

    delete_report = report_exists
    if delete_report:
        actions.append("PDF 보고서 삭제")
    else:
        skipped.append("삭제할 PDF 보고서가 없습니다")

    delete_mlflow_version = False
    delete_model_artifact = False
    has_registry_version_after = model.mlflow_version is not None
    has_model_artifact_after = bool(model.model_path)

    if prediction_count == 0:
        if model.mlflow_version is not None and model.mlflow_model_name:
            delete_mlflow_version = True
            has_registry_version_after = False
            actions.append("MLflow 등록 버전 연결 해제")
        elif model.mlflow_version is not None:
            skipped.append("MLflow 모델명이 없어 등록 버전 해제를 건너뜁니다")
        else:
            skipped.append("등록된 MLflow 버전이 없습니다")

        if model.model_path:
            delete_model_artifact = True
            has_model_artifact_after = False
            actions.append("최종 모델 파일 삭제")
        else:
            skipped.append("삭제할 최종 모델 파일이 없습니다")
    else:
        skipped.append("예측 이력이 있어 MLflow 버전과 최종 모델 파일은 유지됩니다")

    return {
        "current_stage": model.stage or "None",
        "stage_after": "Archived",
        "prediction_count": int(prediction_count),
        "report_exists_before": report_exists,
        "report_exists_after": False,
        "has_registry_version_before": model.mlflow_version is not None,
        "has_registry_version_after": has_registry_version_after,
        "has_model_artifact_before": bool(model.model_path),
        "has_model_artifact_after": has_model_artifact_after,
        "archive_stage": archive_stage,
        "delete_report": delete_report,
        "delete_mlflow_version": delete_mlflow_version,
        "delete_model_artifact": delete_model_artifact,
        "can_cleanup_artifacts": prediction_count == 0,
        "actions": actions,
        "skipped": skipped,
    }


def _project_experiment_delete_state(
    *,
    models: list[TrainedModel],
    prediction_counts: dict[int, int],
    target_model_id: int,
    has_registry_version_after: bool,
    has_model_artifact_after: bool,
    stage_after: str,
) -> dict:
    prediction_total = sum(prediction_counts.get(model.id, 0) for model in models)
    before_blockers = _experiment_delete_blockers(models, prediction_total)

    has_finalized_after = any(
        has_model_artifact_after if model.id == target_model_id else bool(model.model_path) for model in models
    )
    has_registered_after = any(
        has_registry_version_after if model.id == target_model_id else model.mlflow_version is not None
        for model in models
    )
    has_operational_stage_after = any(
        (stage_after in {"Production", "Staging"}) if model.id == target_model_id else (model.stage or "") in {"Production", "Staging"}
        for model in models
    )
    after_blockers = _compose_delete_blockers(
        has_finalized_model=has_finalized_after,
        has_registered_version=has_registered_after,
        has_operational_stage=has_operational_stage_after,
        prediction_count=prediction_total,
    )

    return {
        "experiment_delete_blockers_before": before_blockers,
        "experiment_delete_blockers_after": after_blockers,
        "experiment_deletable_before": not before_blockers,
        "experiment_deletable_after": not after_blockers,
    }


def _retirement_preview(model: TrainedModel, db: Session) -> dict:
    prediction_counts = _prediction_counts(db)
    prediction_count = prediction_counts.get(model.id, 0)
    report_exists = resolve_report_path(model).exists()
    plan = _build_retirement_plan(model, prediction_count, report_exists)
    experiment_models = db.query(TrainedModel).filter(TrainedModel.experiment_id == model.experiment_id).all()
    projection = _project_experiment_delete_state(
        models=experiment_models,
        prediction_counts=prediction_counts,
        target_model_id=model.id,
        has_registry_version_after=plan["has_registry_version_after"],
        has_model_artifact_after=plan["has_model_artifact_after"],
        stage_after=plan["stage_after"],
    )
    return {
        "model_id": model.id,
        "model_name": model.mlflow_model_name or model.algorithm,
        "algorithm": model.algorithm,
        "experiment_id": model.experiment_id,
        **plan,
        **projection,
    }


def _experiment_cleanup_delete_preview(experiment: Experiment, models: list[TrainedModel], db: Session) -> dict:
    prediction_counts = _prediction_counts(db)
    prediction_total = sum(prediction_counts.get(model.id, 0) for model in models)
    report_count = sum(1 for model in models if resolve_report_path(model).exists())
    report_chart_cache_count = sum(1 for model in models if _report_chart_cache_dir(model.id).exists())
    xai_cache_count = sum(1 for model in models if _xai_snapshot_cache_dir(experiment.id, model.algorithm).exists())
    version_count = sum(1 for model in models if model.mlflow_version is not None)
    artifact_count = sum(1 for model in models if model.model_path)
    stage_count = sum(1 for model in models if (model.stage or "") != "Archived")
    blockers = _experiment_delete_blockers(models, prediction_total)

    actions: list[str] = []
    if stage_count:
        actions.append(f"연결된 모델 스테이지 {stage_count}개를 Archived로 변경")
    if report_count:
        actions.append(f"PDF 리포트 {report_count}개 삭제")
    if report_chart_cache_count:
        actions.append(f"보고서 차트 캐시 {report_chart_cache_count}개 정리")
    if xai_cache_count:
        actions.append(f"XAI 스냅샷 캐시 {xai_cache_count}개 정리")
    if version_count:
        actions.append(f"MLflow 등록 버전 {version_count}개 해제")
    if artifact_count:
        actions.append(f"최종 모델 파일 {artifact_count}개 삭제")
    if prediction_total:
        actions.append(f"예측 이력 {prediction_total}건 삭제")
    actions.append(f"학습 모델 {len(models)}개와 실험 메타데이터 삭제")

    return {
        "experiment_id": experiment.id,
        "experiment_name": experiment.name,
        "model_count": len(models),
        "prediction_count": prediction_total,
        "report_count": report_count,
        "version_count": version_count,
        "artifact_count": artifact_count,
        "delete_blockers_before": blockers,
        "actions": actions,
    }


@router.get("/experiments")
def list_managed_experiments(db: Session = Depends(get_db)):
    datasets = {row.id: row for row in db.query(Dataset).all()}
    prediction_counts = _prediction_counts(db)
    model_rows = db.query(TrainedModel).order_by(TrainedModel.id.desc()).all()
    models_by_experiment: dict[int, list[TrainedModel]] = defaultdict(list)
    for model in model_rows:
        models_by_experiment[int(model.experiment_id or 0)].append(model)

    payload = []
    experiments = db.query(Experiment).order_by(Experiment.created_at.desc(), Experiment.id.desc()).all()
    for experiment in experiments:
        models = models_by_experiment.get(experiment.id, [])
        prediction_total = sum(prediction_counts.get(model.id, 0) for model in models)
        blockers = _experiment_delete_blockers(models, prediction_total)
        finalized_count = sum(1 for model in models if model.model_path)
        registered_count = sum(1 for model in models if model.mlflow_version is not None)
        production_count = sum(1 for model in models if (model.stage or "") == "Production")
        report_count = sum(
            1
            for model in models
            if (model.model_path or model.mlflow_version is not None) and resolve_report_path(model).exists()
        )
        payload.append(
            {
                "experiment_id": experiment.id,
                "name": experiment.name,
                "module_type": experiment.module_type,
                "target_col": experiment.target_col,
                "status": experiment.status or "setup",
                "created_at": experiment.created_at,
                "dataset_id": experiment.dataset_id,
                "dataset_name": datasets.get(experiment.dataset_id).filename if datasets.get(experiment.dataset_id) else "-",
                "model_count": len(models),
                "candidate_count": sum(1 for model in models if not model.model_path and model.mlflow_version is None),
                "finalized_count": finalized_count,
                "registered_count": registered_count,
                "production_count": production_count,
                "prediction_count": prediction_total,
                "report_count": report_count,
                "context_exists": _experiment_dir(experiment.id).exists(),
                "delete_blockers": blockers,
                "can_delete": not blockers,
            }
        )
    return {"experiments": payload}


@router.put("/experiments/{experiment_id}/archive")
def archive_experiment(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    experiment.status = "archived"
    db.commit()
    return {"experiment_id": experiment.id, "status": experiment.status}


@router.delete("/experiments/{experiment_id}")
def delete_experiment(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    models = db.query(TrainedModel).filter(TrainedModel.experiment_id == experiment_id).all()
    prediction_counts = _prediction_counts(db)
    prediction_total = sum(prediction_counts.get(model.id, 0) for model in models)
    blockers = _experiment_delete_blockers(models, prediction_total)
    if blockers:
        raise HTTPException(status_code=400, detail=f"삭제할 수 없는 실험입니다: {', '.join(blockers)}")

    db.query(TrainedModel).filter(TrainedModel.experiment_id == experiment_id).delete()
    db.delete(experiment)
    db.commit()

    experiment_dir = _experiment_dir(experiment_id)
    if experiment_dir.exists():
        shutil.rmtree(experiment_dir, ignore_errors=True)
    EXPERIMENT_CONTEXTS.pop(experiment_id, None)

    return {"experiment_id": experiment_id, "deleted": True}


@router.get("/experiments/{experiment_id}/cleanup-delete-preview")
def cleanup_delete_experiment_preview(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    models = db.query(TrainedModel).filter(TrainedModel.experiment_id == experiment_id).all()
    return _experiment_cleanup_delete_preview(experiment, models, db)


@router.post("/experiments/{experiment_id}/cleanup-delete")
def cleanup_delete_experiment(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    models = db.query(TrainedModel).filter(TrainedModel.experiment_id == experiment_id).all()
    preview = _experiment_cleanup_delete_preview(experiment, models, db)
    model_ids = [model.id for model in models]
    actions: list[str] = []
    skipped: list[str] = []
    mlflow_synced = True

    for model in models:
        if (model.stage or "") != "Archived" and model.mlflow_version is not None and model.mlflow_model_name:
            try:
                transition_model_stage(model.mlflow_model_name, int(model.mlflow_version), "Archived")
            except Exception as exc:
                skipped.append(f"{model.algorithm}: MLflow 스테이지 변경 실패 ({exc})")
                mlflow_synced = False

        report_path = resolve_report_path(model)
        if report_path.exists():
            report_path.unlink()

        chart_cache_dir = _report_chart_cache_dir(model.id)
        if chart_cache_dir.exists():
            shutil.rmtree(chart_cache_dir, ignore_errors=True)

        xai_cache_dir = _xai_snapshot_cache_dir(experiment.id, model.algorithm)
        if xai_cache_dir.exists():
            shutil.rmtree(xai_cache_dir, ignore_errors=True)

        if model.mlflow_version is not None and model.mlflow_model_name:
            try:
                delete_model_version(model.mlflow_model_name, int(model.mlflow_version))
            except Exception as exc:
                skipped.append(f"{model.algorithm}: MLflow 등록 버전 해제 실패 ({exc})")
                mlflow_synced = False

        if model.model_path:
            model_file = Path(model.model_path)
            if model_file.exists():
                model_file.unlink()
            _remove_model_from_context_metadata(model.experiment_id, model.algorithm)

    if model_ids:
        deleted_predictions = (
            db.query(Prediction)
            .filter(Prediction.model_id.in_(model_ids))
            .delete(synchronize_session=False)
        )
    else:
        deleted_predictions = 0

    db.query(TrainedModel).filter(TrainedModel.experiment_id == experiment_id).delete(synchronize_session=False)
    db.delete(experiment)
    db.commit()

    experiment_dir = _experiment_dir(experiment_id)
    if experiment_dir.exists():
        shutil.rmtree(experiment_dir, ignore_errors=True)

    xai_root = Path(settings.report_dir) / "xai_cache" / f"experiment_{experiment_id}"
    if xai_root.exists():
        shutil.rmtree(xai_root, ignore_errors=True)

    EXPERIMENT_CONTEXTS.pop(experiment_id, None)

    if experiment.mlflow_exp_id:
        try:
            delete_mlflow_experiment(str(experiment.mlflow_exp_id))
        except Exception as exc:
            skipped.append(f"MLflow experiment 삭제 실패 ({exc})")
            mlflow_synced = False

    actions.extend(preview["actions"])
    return {
        "experiment_id": experiment_id,
        "experiment_name": preview["experiment_name"],
        "deleted": True,
        "deleted_predictions": int(deleted_predictions),
        "mlflow_synced": mlflow_synced,
        "actions": actions,
        "skipped": skipped,
    }


@router.get("/mlflow-orphans")
def list_mlflow_orphans(db: Session = Depends(get_db)):
    return _list_mlflow_orphans(db)


@router.delete("/mlflow-experiments/{mlflow_experiment_id}")
def delete_orphan_mlflow_experiment(mlflow_experiment_id: str):
    try:
        return delete_mlflow_experiment(mlflow_experiment_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"MLflow experiment 삭제 실패: {exc}") from exc


@router.delete("/mlflow-models/{model_name}")
def delete_orphan_mlflow_model(model_name: str):
    try:
        return delete_registered_model_name(model_name)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"MLflow 모델 삭제 실패: {exc}") from exc


@router.get("/reports")
def list_managed_reports(db: Session = Depends(get_db)):
    experiments = {row.id: row for row in db.query(Experiment).all()}
    datasets = {row.id: row for row in db.query(Dataset).all()}
    prediction_counts = _prediction_counts(db)
    models = (
        db.query(TrainedModel)
        .filter((TrainedModel.model_path.isnot(None)) | (TrainedModel.mlflow_version.isnot(None)))
        .order_by(TrainedModel.updated_at.desc(), TrainedModel.id.desc())
        .all()
    )

    payload = []
    for model in models:
        experiment = experiments.get(model.experiment_id)
        dataset = datasets.get(experiment.dataset_id) if experiment else None
        report_path = resolve_report_path(model)
        report_exists = report_path.exists()
        payload.append(
            {
                "model_id": model.id,
                "model_name": model.mlflow_model_name or model.algorithm,
                "algorithm": model.algorithm,
                "experiment_id": model.experiment_id,
                "experiment_name": experiment.name if experiment else "-",
                "dataset_name": dataset.filename if dataset else "-",
                "stage": model.stage or "None",
                "version": model.mlflow_version,
                "prediction_count": prediction_counts.get(model.id, 0),
                "can_cleanup_artifacts": prediction_counts.get(model.id, 0) == 0,
                "has_registry_version": model.mlflow_version is not None,
                "has_model_artifact": bool(model.model_path),
                "mlflow_synced": not str(model.mlflow_run_id or "").startswith("local-"),
                "report_path": str(report_path),
                "report_exists": report_exists,
                "report_updated_at": datetime.fromtimestamp(report_path.stat().st_mtime).isoformat() if report_exists else None,
                "updated_at": model.updated_at,
            }
        )
    return {"reports": payload}


@router.get("/cache-status")
def get_cache_status():
    return _cache_status_payload()


@router.post("/cache-cleanup")
def cleanup_cache_status():
    report_chart_root = Path(settings.report_dir) / "chart_cache"
    xai_snapshot_root = Path(settings.report_dir) / "xai_cache"
    report_cleanup = cleanup_cache_tree(
        report_chart_root,
        max_age_seconds=retention_seconds(settings.report_chart_cache_retention_days),
    )
    xai_cleanup = cleanup_cache_tree(
        xai_snapshot_root,
        max_age_seconds=retention_seconds(settings.xai_snapshot_cache_retention_days),
    )
    return {
        "cleanup": {
            "report_chart_cache": report_cleanup,
            "xai_snapshot_cache": xai_cleanup,
        },
        **_cache_status_payload(),
    }


@router.delete("/reports/{model_id}")
def delete_report_file(model_id: int, db: Session = Depends(get_db)):
    model = db.query(TrainedModel).filter(TrainedModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    report_path = resolve_report_path(model)
    deleted = False
    if report_path.exists():
        report_path.unlink()
        deleted = True
    return {
        "model_id": model.id,
        "report_path": str(report_path),
        "report_exists": report_path.exists(),
        "deleted": deleted,
    }


@router.get("/models/{model_id}/retire-preview")
def retire_model_preview(model_id: int, db: Session = Depends(get_db)):
    model = db.query(TrainedModel).filter(TrainedModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return _retirement_preview(model, db)


@router.post("/models/{model_id}/retire")
def retire_model_assets(model_id: int, db: Session = Depends(get_db)):
    model = db.query(TrainedModel).filter(TrainedModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    preview = _retirement_preview(model, db)
    actions: list[str] = []
    skipped = list(preview["skipped"])
    mlflow_synced = False

    if preview["archive_stage"] and model.mlflow_version is not None and model.mlflow_model_name:
        try:
            transition_model_stage(model.mlflow_model_name, int(model.mlflow_version), "Archived")
            mlflow_synced = True
        except Exception as exc:
            skipped.append(f"MLflow 스테이지 동기화 실패: {exc}")

    if preview["archive_stage"]:
        model.stage = "Archived"
        actions.append("스테이지를 Archived로 변경")

    report_path = resolve_report_path(model)
    if preview["delete_report"] and report_path.exists():
        report_path.unlink()
        actions.append("PDF 보고서 삭제")

    if preview["delete_mlflow_version"] and model.mlflow_version is not None and model.mlflow_model_name:
        try:
            delete_model_version(model.mlflow_model_name, int(model.mlflow_version))
            actions.append("MLflow 등록 버전 연결 해제")
            model.mlflow_version = None
        except Exception as exc:
            skipped.append(f"MLflow 버전 해제 실패: {exc}")

    if preview["delete_model_artifact"] and model.model_path:
        model_file = Path(model.model_path)
        if model_file.exists():
            model_file.unlink()
        model.model_path = None
        _remove_model_from_context_metadata(model.experiment_id, model.algorithm)
        actions.append("최종 모델 파일 삭제")

    db.commit()
    db.refresh(model)

    refreshed_preview = _retirement_preview(model, db)
    return {
        "model_id": model.id,
        "stage": model.stage,
        "prediction_count": refreshed_preview["prediction_count"],
        "mlflow_synced": mlflow_synced,
        "has_model_artifact": refreshed_preview["has_model_artifact_after"],
        "has_registry_version": refreshed_preview["has_registry_version_after"],
        "report_exists": refreshed_preview["report_exists_after"],
        "actions": actions,
        "skipped": skipped,
        "experiment_delete_blockers_after": refreshed_preview["experiment_delete_blockers_after"],
        "experiment_deletable_after": refreshed_preview["experiment_deletable_after"],
    }
