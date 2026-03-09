import json
import asyncio

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from database import get_db
from models.dataset import Dataset
from models.experiment import Experiment
from models.trained_model import TrainedModel
from services.pycaret_service import (
    generate_compare_results,
    generate_tune_trials,
    list_available_models,
    run_setup,
    summarize_tune_result,
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


@router.post("/setup")
def setup_experiment(req: SetupRequest, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="데이터셋을 찾을 수 없습니다")

    result = run_setup(
        dataset_path=dataset.stored_path,
        module_type=req.module_type,
        params=req.params,
        mlflow_experiment_name=req.experiment_name,
    )

    experiment = Experiment(
        name=req.experiment_name,
        dataset_id=req.dataset_id,
        module_type=req.module_type,
        target_col=req.params.get("target_col"),
        setup_params=json.dumps(req.params, ensure_ascii=False),
        mlflow_exp_id=result.get("mlflow_experiment_id"),
        mlflow_exp_name=req.experiment_name,
        status="setup",
    )
    db.add(experiment)
    db.commit()
    db.refresh(experiment)

    return {
        "experiment_id": experiment.id,
        "pipeline_steps": result.get("pipeline_steps", []),
        "transformed_shape": result.get("transformed_shape"),
    }


@router.get("/setup/{experiment_id}/code")
def get_setup_code(experiment_id: int, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="실험을 찾을 수 없습니다")

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
        raise HTTPException(status_code=404, detail="실험을 찾을 수 없습니다")

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
        raise HTTPException(status_code=404, detail="실험을 찾을 수 없습니다")

    params = json.loads(experiment.setup_params or "{}")
    options = params.get("compare_options", {})
    results = generate_compare_results(experiment_id, experiment.module_type, options)

    db.query(TrainedModel).filter(TrainedModel.experiment_id == experiment_id).delete()
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
            await asyncio.sleep(0.15)
            yield {
                "event": "model_result",
                "data": json.dumps(row, ensure_ascii=False),
            }
        await asyncio.sleep(0.05)
        yield {
            "event": "done",
            "data": json.dumps(
                {
                    "best_algorithm": results[0]["algorithm"] if results else None,
                    "experiment_id": experiment_id,
                },
                ensure_ascii=False,
            ),
        }

    return EventSourceResponse(event_generator())


@router.get("/compare/{experiment_id}/result")
def get_compare_result(experiment_id: int, db: Session = Depends(get_db)):
    models = db.query(TrainedModel).filter(TrainedModel.experiment_id == experiment_id).all()
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
    return {"models": list_available_models(module_type)}


@router.post("/tune")
def start_tune(req: TuneRequest, db: Session = Depends(get_db)):
    experiment = db.query(Experiment).filter(Experiment.id == req.experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="실험을 찾을 수 없습니다")

    job_id = f"{req.experiment_id}__{req.algorithm}"
    params = json.loads(experiment.setup_params or "{}")
    params["tune_job"] = {
        "job_id": job_id,
        "algorithm": req.algorithm,
        "options": req.tune_options,
    }
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
        raise HTTPException(status_code=400, detail="잘못된 job_id 형식입니다") from exc

    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="실험을 찾을 수 없습니다")

    params = json.loads(experiment.setup_params or "{}")
    tune_options = params.get("tune_job", {}).get("options", {})
    n_iter = int(tune_options.get("n_iter", 20))
    trials = generate_tune_trials(experiment_id, algorithm, n_iter=n_iter)
    summary = summarize_tune_result(algorithm, trials)

    model = (
        db.query(TrainedModel)
        .filter(TrainedModel.experiment_id == experiment_id, TrainedModel.algorithm == algorithm)
        .first()
    )
    if model:
        model.is_tuned = True
        model.hyperparams = json.dumps(summary["changed_params"], ensure_ascii=False)
        model.metrics = json.dumps(summary["after_metrics"], ensure_ascii=False)
    experiment.status = "done"
    db.commit()

    async def event_generator():
        for trial in trials:
            await asyncio.sleep(0.06)
            yield {"event": "trial", "data": json.dumps(trial, ensure_ascii=False)}
        await asyncio.sleep(0.05)
        yield {"event": "done", "data": json.dumps(summary, ensure_ascii=False)}

    return EventSourceResponse(event_generator())
