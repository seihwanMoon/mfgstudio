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
from services.mlflow_service import delete_model_version, transition_model_stage
from services.pycaret_service import EXPERIMENT_CONTEXTS
from services.report_service import resolve_report_path

router = APIRouter()


def _experiment_dir(experiment_id: int) -> Path:
    return Path(settings.experiment_dir) / f"experiment_{experiment_id}"


def _prediction_counts(db: Session) -> dict[int, int]:
    rows = db.query(Prediction.model_id, func.count(Prediction.id)).group_by(Prediction.model_id).all()
    return {int(model_id): int(count) for model_id, count in rows}


def _experiment_delete_blockers(models: list[TrainedModel], prediction_count: int) -> list[str]:
    blockers = []
    if any(model.model_path for model in models):
        blockers.append("finalize된 모델이 있습니다")
    if any(model.mlflow_version is not None for model in models):
        blockers.append("레지스트리에 등록된 버전이 있습니다")
    if any((model.stage or "") in {"Production", "Staging"} for model in models):
        blockers.append("운영 스테이지 모델이 있습니다")
    if prediction_count > 0:
        blockers.append("예측 이력이 있습니다")
    return blockers


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
                "report_path": str(report_path),
                "report_exists": report_exists,
                "report_updated_at": datetime.fromtimestamp(report_path.stat().st_mtime).isoformat() if report_exists else None,
                "updated_at": model.updated_at,
            }
        )
    return {"reports": payload}


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


@router.post("/models/{model_id}/retire")
def retire_model_assets(model_id: int, db: Session = Depends(get_db)):
    model = db.query(TrainedModel).filter(TrainedModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    prediction_count = db.query(func.count(Prediction.id)).filter(Prediction.model_id == model.id).scalar() or 0
    actions: list[str] = []
    skipped: list[str] = []
    mlflow_synced = False

    if model.mlflow_version is not None and model.mlflow_model_name:
        try:
            transition_model_stage(model.mlflow_model_name, int(model.mlflow_version), "Archived")
            mlflow_synced = True
        except Exception:
            mlflow_synced = False
    if (model.stage or "") != "Archived":
        model.stage = "Archived"
        actions.append("스테이지를 Archived로 변경")

    report_path = resolve_report_path(model)
    if report_path.exists():
        report_path.unlink()
        actions.append("PDF 리포트 삭제")

    if prediction_count == 0:
        if model.mlflow_version is not None and model.mlflow_model_name:
            try:
                delete_model_version(model.mlflow_model_name, int(model.mlflow_version))
                actions.append("MLflow 등록 버전 해제")
                model.mlflow_version = None
            except Exception as exc:
                skipped.append(f"MLflow 버전 해제 실패: {exc}")
        if model.model_path:
            model_file = Path(model.model_path)
            if model_file.exists():
                model_file.unlink()
                actions.append("최종 모델 파일 삭제")
            model.model_path = None
            _remove_model_from_context_metadata(model.experiment_id, model.algorithm)
        if model.mlflow_version is None and model.stage == "Archived":
            actions.append("실험 삭제 가능 상태 재평가 대상")
    else:
        skipped.append("예측 이력이 있어 MLflow 버전과 최종 모델 파일은 유지")

    db.commit()
    db.refresh(model)

    return {
        "model_id": model.id,
        "stage": model.stage,
        "prediction_count": int(prediction_count),
        "mlflow_synced": mlflow_synced,
        "has_model_artifact": bool(model.model_path),
        "has_registry_version": model.mlflow_version is not None,
        "report_exists": report_path.exists(),
        "actions": actions,
        "skipped": skipped,
    }
