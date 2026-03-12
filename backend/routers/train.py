import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from database import get_db
from models.dataset import Dataset
from models.experiment import Experiment
from models.trained_model import TrainedModel
from services.pycaret_service import (
    automl_best_real,
    blend_models_real,
    calibrate_model_real,
    compare_models_real,
    ensure_experiment_context,
    finalize_model_real,
    list_available_models,
    optimize_threshold_real,
    run_setup,
    stack_models_real,
    tune_model_real,
)

router = APIRouter()


class SetupRequest(BaseModel):
    dataset_id: int
    module_type: str
    params: dict
    experiment_name: str


class CompareRequest(BaseModel):
    experiment_id: int
    options: dict = {}


class TuneRequest(BaseModel):
    experiment_id: int
    algorithm: str
    tune_options: dict = {}


class EnsembleRequest(BaseModel):
    experiment_id: int
    algorithms: list[str]
    method: str
    options: dict = {}


class AutoMLRequest(BaseModel):
    experiment_id: int
    options: dict = {}


class ClassificationOptimizeRequest(BaseModel):
    experiment_id: int
    algorithm: str
    method: str
    options: dict = {}


def _candidate_model_slug(experiment_name: str, algorithm: str) -> str:
    return f"{experiment_name}_{algorithm.lower().replace(' ', '_').replace('(', '').replace(')', '')}"


def _upsert_generated_candidate(db: Session, experiment: Experiment, summary: dict) -> TrainedModel:
    algorithm = summary["algorithm"]
    (
        db.query(TrainedModel)
        .filter(
            TrainedModel.experiment_id == experiment.id,
            TrainedModel.algorithm == algorithm,
            TrainedModel.model_path.is_(None),
            TrainedModel.mlflow_version.is_(None),
        )
        .delete()
    )
    model = TrainedModel(
        experiment_id=experiment.id,
        algorithm=algorithm,
        is_tuned=summary["operation"] in {"blend", "stack", "automl"},
        metrics=json.dumps(summary["after_metrics"], ensure_ascii=False),
        hyperparams=json.dumps(
            {
                "operation": summary["operation"],
                "members": summary.get("members", []),
                "resolved_model_name": summary.get("resolved_model_name"),
            },
            ensure_ascii=False,
        ),
        mlflow_run_id=summary["run_id"],
        mlflow_model_name=_candidate_model_slug(experiment.name, algorithm),
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


@router.post("/setup")
def setup_experiment(req: SetupRequest, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    experiment = Experiment(
        name=req.experiment_name,
        dataset_id=req.dataset_id,
        module_type=req.module_type,
        target_col=req.params.get("target_col"),
        setup_params=json.dumps(req.params, ensure_ascii=False),
        mlflow_exp_name=req.experiment_name,
        status="setup",
    )
    db.add(experiment)
    db.commit()
    db.refresh(experiment)

    try:
        result = run_setup(
            experiment_id=experiment.id,
            dataset_path=dataset.stored_path,
            module_type=req.module_type,
            params=req.params,
            mlflow_experiment_name=req.experiment_name,
        )
    except Exception as exc:
        experiment.status = "setup_error"
        db.commit()
        raise HTTPException(status_code=500, detail=f"setup failed: {exc}") from exc

    experiment.mlflow_exp_id = result.get("mlflow_experiment_id")
    db.commit()
    return {
        "experiment_id": experiment.id,
        "pipeline_steps": result.get("pipeline_steps", []),
        "transformed_shape": result.get("transformed_shape"),
    }


@router.get("/setup/{experiment_id}/code")
def get_setup_code(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    params = json.loads(experiment.setup_params or "{}")
    module_imports = {
        "classification": "from pycaret.classification import *",
        "regression": "from pycaret.regression import *",
        "clustering": "from pycaret.clustering import *",
        "anomaly": "from pycaret.anomaly import *",
        "timeseries": "from pycaret.time_series import *",
    }
    lines = [
        "# PyCaret 3.0 - generated setup code",
        module_imports.get(experiment.module_type, module_imports["classification"]),
        "",
        "s = setup(",
        "    data=df,",
    ]
    if experiment.target_col:
        lines.append(f"    target='{experiment.target_col}',")
    for key, value in params.items():
        if key == "target_col":
            continue
        if isinstance(value, str):
            lines.append(f"    {key}='{value}',")
        else:
            lines.append(f"    {key}={value},")
    lines.append(")")
    return {"code": "\n".join(lines)}


@router.post("/compare")
def start_compare(req: CompareRequest, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == req.experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    params = json.loads(experiment.setup_params or "{}")
    params["compare_options"] = req.options
    experiment.setup_params = json.dumps(params, ensure_ascii=False)
    experiment.status = "comparing"
    db.commit()

    return {
        "job_id": req.experiment_id,
        "stream_url": f"/api/train/compare/{req.experiment_id}/stream",
    }


@router.get("/compare/{experiment_id}/stream")
async def compare_stream(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    dataset = db.query(Dataset).filter(Dataset.id == experiment.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    params = json.loads(experiment.setup_params or "{}")
    options = params.get("compare_options", {})

    try:
        ensure_experiment_context(
            experiment_id=experiment.id,
            dataset_path=dataset.stored_path,
            module_type=experiment.module_type,
            params=params,
            experiment_name=experiment.name,
        )
        results = compare_models_real(experiment_id, options)
    except Exception as exc:
        experiment.status = "compare_error"
        db.commit()
        raise HTTPException(status_code=500, detail=f"compare failed: {exc}") from exc

    db.query(TrainedModel).filter(
        TrainedModel.experiment_id == experiment_id,
        TrainedModel.model_path.is_(None),
        TrainedModel.mlflow_version.is_(None),
    ).delete()
    for row in results:
        db.add(
            TrainedModel(
                experiment_id=experiment_id,
                algorithm=row["algorithm"],
                metrics=json.dumps(row["metrics"], ensure_ascii=False),
                mlflow_run_id=row["mlflow_run_id"],
                mlflow_model_name=f"{experiment.name}_{row['algorithm'].lower().replace(' ', '_')}",
            )
        )
    experiment.status = "done"
    db.commit()

    async def event_generator():
        for row in results:
            await asyncio.sleep(0.1)
            yield {"event": "model_result", "data": json.dumps(row, ensure_ascii=False)}
        yield {
            "event": "done",
            "data": json.dumps(
                {"best_algorithm": results[0]["algorithm"] if results else None, "experiment_id": experiment_id},
                ensure_ascii=False,
            ),
        }

    return EventSourceResponse(event_generator())


@router.get("/compare/{experiment_id}/result")
def get_compare_result(experiment_id: int, db: Session = Depends(get_db)):
    models = (
        db.query(TrainedModel)
        .filter(
            TrainedModel.experiment_id == experiment_id,
            TrainedModel.model_path.is_(None),
            TrainedModel.mlflow_version.is_(None),
        )
        .order_by(TrainedModel.id.asc())
        .all()
    )
    return [
        {
            "id": model.id,
            "algorithm": model.algorithm,
            "metrics": json.loads(model.metrics or "{}"),
            "mlflow_run_id": model.mlflow_run_id,
        }
        for model in models
    ]


@router.get("/models")
def list_models(module_type: str = "classification"):
    catalog = list_available_models(module_type)
    families = sorted({item.get("family", "other") for item in catalog})
    tags = sorted({tag for item in catalog for tag in item.get("tags", [])})
    return {
        "models": [item["name"] for item in catalog],
        "catalog": catalog,
        "families": families,
        "tags": tags,
    }


@router.post("/tune")
def start_tune(req: TuneRequest, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == req.experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    job_id = f"{req.experiment_id}__{req.algorithm}"
    params = json.loads(experiment.setup_params or "{}")
    params["tune_job"] = {"job_id": job_id, "algorithm": req.algorithm, "options": req.tune_options}
    experiment.setup_params = json.dumps(params, ensure_ascii=False)
    experiment.status = "tuning"
    db.commit()

    return {"job_id": job_id, "stream_url": f"/api/train/tune/{job_id}/stream"}


@router.get("/tune/{job_id}/stream")
async def tune_stream(job_id: str, db: Session = Depends(get_db)):
    try:
        experiment_id_str, algorithm = job_id.split("__", 1)
        experiment_id = int(experiment_id_str)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid tune job id") from exc

    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    dataset = db.query(Dataset).filter(Dataset.id == experiment.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    params = json.loads(experiment.setup_params or "{}")
    tune_options = params.get("tune_job", {}).get("options", {})

    try:
        ensure_experiment_context(
            experiment_id=experiment.id,
            dataset_path=dataset.stored_path,
            module_type=experiment.module_type,
            params=params,
            experiment_name=experiment.name,
        )
        summary = tune_model_real(experiment_id, algorithm, tune_options)
        trials = summary.get("trials", [])
    except Exception as exc:
        experiment.status = "tune_error"
        db.commit()
        raise HTTPException(status_code=500, detail=f"tune failed: {exc}") from exc

    model = (
        db.query(TrainedModel)
        .filter(
            TrainedModel.experiment_id == experiment_id,
            TrainedModel.algorithm == algorithm,
            TrainedModel.model_path.is_(None),
            TrainedModel.mlflow_version.is_(None),
        )
        .order_by(TrainedModel.id.desc())
        .first()
    )
    if model:
        model.is_tuned = True
        model.hyperparams = json.dumps(summary["changed_params"], ensure_ascii=False)
        model.metrics = json.dumps(summary["after_metrics"], ensure_ascii=False)
        model.mlflow_run_id = summary.get("run_id")
    if summary.get("mlflow_experiment_id") is not None:
        experiment.mlflow_exp_id = str(summary["mlflow_experiment_id"])
    experiment.status = "done"
    db.commit()

    async def event_generator():
        for trial in trials:
            await asyncio.sleep(0.04)
            yield {"event": "trial", "data": json.dumps(trial, ensure_ascii=False)}
        yield {"event": "done", "data": json.dumps(summary, ensure_ascii=False)}

    return EventSourceResponse(event_generator())


@router.post("/finalize/{model_id}")
def finalize_model(model_id: int, db: Session = Depends(get_db)):
    model = db.query(TrainedModel).filter(TrainedModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    experiment = db.query(Experiment).filter(Experiment.id == model.experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    dataset = db.query(Dataset).filter(Dataset.id == experiment.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    params = json.loads(experiment.setup_params or "{}")
    final_name = model.mlflow_model_name or f"{model.algorithm.lower().replace(' ', '_')}_final"
    metrics = json.loads(model.metrics or "{}")

    try:
        ensure_experiment_context(
            experiment_id=experiment.id,
            dataset_path=dataset.stored_path,
            module_type=experiment.module_type,
            params=params,
            experiment_name=experiment.name,
        )
        result = finalize_model_real(experiment.id, model.algorithm, final_name, metrics)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"finalize failed: {exc}") from exc

    model.model_path = result["model_path"]
    model.metrics = json.dumps(result["final_metrics"], ensure_ascii=False)
    model.mlflow_run_id = result["run_id"]
    experiment.mlflow_exp_id = str(result["mlflow_experiment_id"])
    db.commit()
    return {
        "model_id": model.id,
        "model_path": model.model_path,
        "final_metrics": result["final_metrics"],
        "run_id": result["run_id"],
    }


@router.post("/ensemble")
def create_ensemble_candidate(req: EnsembleRequest, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == req.experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    dataset = db.query(Dataset).filter(Dataset.id == experiment.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    params = json.loads(experiment.setup_params or "{}")

    try:
        ensure_experiment_context(
            experiment_id=experiment.id,
            dataset_path=dataset.stored_path,
            module_type=experiment.module_type,
            params=params,
            experiment_name=experiment.name,
        )
        if req.method == "blend":
            summary = blend_models_real(experiment.id, req.algorithms, req.options)
        elif req.method == "stack":
            summary = stack_models_real(experiment.id, req.algorithms, req.options)
        else:
            raise HTTPException(status_code=400, detail="Unsupported ensemble method")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{req.method} failed: {exc}") from exc

    model = _upsert_generated_candidate(db, experiment, summary)
    return {
        "model_id": model.id,
        "algorithm": summary["algorithm"],
        "operation": summary["operation"],
        "members": summary.get("members", []),
        "after_metrics": summary["after_metrics"],
        "run_id": summary["run_id"],
    }


@router.post("/automl")
def create_automl_candidate(req: AutoMLRequest, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == req.experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    dataset = db.query(Dataset).filter(Dataset.id == experiment.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    params = json.loads(experiment.setup_params or "{}")

    try:
        ensure_experiment_context(
            experiment_id=experiment.id,
            dataset_path=dataset.stored_path,
            module_type=experiment.module_type,
            params=params,
            experiment_name=experiment.name,
        )
        summary = automl_best_real(experiment.id, req.options)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"automl failed: {exc}") from exc

    model = _upsert_generated_candidate(db, experiment, summary)
    return {
        "model_id": model.id,
        "algorithm": summary["algorithm"],
        "operation": summary["operation"],
        "resolved_model_name": summary.get("resolved_model_name"),
        "after_metrics": summary["after_metrics"],
        "run_id": summary["run_id"],
    }


@router.post("/classification-optimize")
def create_classification_optimization_candidate(req: ClassificationOptimizeRequest, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == req.experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    dataset = db.query(Dataset).filter(Dataset.id == experiment.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    params = json.loads(experiment.setup_params or "{}")

    try:
        ensure_experiment_context(
            experiment_id=experiment.id,
            dataset_path=dataset.stored_path,
            module_type=experiment.module_type,
            params=params,
            experiment_name=experiment.name,
        )
        if req.method == "calibrate":
            summary = calibrate_model_real(experiment.id, req.algorithm, req.options)
        elif req.method == "threshold":
            summary = optimize_threshold_real(experiment.id, req.algorithm, req.options)
        else:
            raise HTTPException(status_code=400, detail="Unsupported classification optimization method")
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{req.method} failed: {exc}") from exc

    model = _upsert_generated_candidate(db, experiment, summary)
    return {
        "model_id": model.id,
        "algorithm": summary["algorithm"],
        "operation": summary["operation"],
        "members": summary.get("members", []),
        "after_metrics": summary["after_metrics"],
        "run_id": summary["run_id"],
        "method": summary.get("method"),
        "optimize": summary.get("optimize"),
    }
