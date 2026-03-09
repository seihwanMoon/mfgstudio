# BACKEND — FastAPI + PyCaret 서비스 코드 템플릿

---

## DB 모델

### `backend/models/dataset.py`
```python
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from database import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id          = Column(Integer, primary_key=True, index=True)
    filename    = Column(String, nullable=False)
    stored_path = Column(String, nullable=False)      # parquet 경로
    encoding    = Column(String, default="utf-8")
    row_count   = Column(Integer)
    col_count   = Column(Integer)
    col_meta    = Column(Text)                        # JSON
    created_at  = Column(DateTime, server_default=func.now())
```

### `backend/models/experiment.py`
```python
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from database import Base


class Experiment(Base):
    __tablename__ = "experiments"

    id              = Column(Integer, primary_key=True)
    name            = Column(String, nullable=False)
    dataset_id      = Column(Integer, ForeignKey("datasets.id"))
    module_type     = Column(String, nullable=False)
    target_col      = Column(String)
    setup_params    = Column(Text)                    # JSON
    mlflow_exp_id   = Column(String)
    mlflow_exp_name = Column(String)
    status          = Column(String, default="setup")
    created_at      = Column(DateTime, server_default=func.now())
```

### `backend/models/trained_model.py`
```python
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from database import Base


class TrainedModel(Base):
    __tablename__ = "trained_models"

    id                 = Column(Integer, primary_key=True)
    experiment_id      = Column(Integer, ForeignKey("experiments.id"))
    algorithm          = Column(String, nullable=False)
    is_tuned           = Column(Boolean, default=False)
    metrics            = Column(Text)                 # JSON
    hyperparams        = Column(Text)                 # JSON
    model_path         = Column(String)
    mlflow_run_id      = Column(String)
    mlflow_model_name  = Column(String)
    mlflow_version     = Column(Integer)
    stage              = Column(String, default="None")
    drift_score        = Column(Float, default=0.0)
    pred_count_total   = Column(Integer, default=0)
    pred_count_today   = Column(Integer, default=0)
    created_at         = Column(DateTime, server_default=func.now())
    updated_at         = Column(DateTime, server_default=func.now(), onupdate=func.now())
```

---

## PyCaret Service

### `backend/services/pycaret_service.py`

```python
"""
PyCaret 3.0 래퍼 서비스
모든 PyCaret 호출은 이 모듈에서만 이루어집니다.
"""
import json
import io
import base64
import asyncio
from functools import lru_cache
from pathlib import Path
from typing import Optional, AsyncGenerator

import pandas as pd
import matplotlib
matplotlib.use("Agg")  # GUI 없는 환경에서 matplotlib 사용
import matplotlib.pyplot as plt

from config import settings

# ── 모듈 타입별 PyCaret import ─────────────────────────────
def _get_pycaret_module(module_type: str):
    if module_type == "classification":
        import pycaret.classification as pc
    elif module_type == "regression":
        import pycaret.regression as pc
    elif module_type == "clustering":
        import pycaret.clustering as pc
    elif module_type == "anomaly":
        import pycaret.anomaly as pc
    elif module_type == "timeseries":
        import pycaret.time_series as pc
    else:
        raise ValueError(f"지원하지 않는 모듈 타입: {module_type}")
    return pc


# ── setup() ───────────────────────────────────────────────
def run_setup(
    dataset_path: str,
    module_type: str,
    params: dict,
    mlflow_experiment_name: str,
) -> dict:
    """
    PyCaret setup() 실행

    Returns:
        {
            pipeline_steps: [...],
            transformed_shape: [rows, cols],
            target_distribution: {...},   # 분류/회귀만
        }
    """
    pc = _get_pycaret_module(module_type)

    df = pd.read_parquet(dataset_path)

    setup_kwargs = {
        "data": df,
        "log_experiment": True,
        "experiment_name": mlflow_experiment_name,
        "log_plots": params.get("log_plots", True),
        "session_id": params.get("session_id", 42),
        "verbose": False,
    }

    # 분류/회귀 전용 파라미터
    if module_type in ("classification", "regression"):
        setup_kwargs["target"] = params["target_col"]
        setup_kwargs["train_size"] = params.get("train_size", 0.8)
        setup_kwargs["fold"] = params.get("fold", 10)

    # 전처리 옵션
    if params.get("normalize"):
        setup_kwargs["normalize"] = True
        setup_kwargs["normalize_method"] = params.get("normalize_method", "zscore")
    if params.get("fix_imbalance"):
        setup_kwargs["fix_imbalance"] = True
    if params.get("remove_outliers"):
        setup_kwargs["remove_outliers"] = True
        setup_kwargs["outliers_threshold"] = params.get("outliers_threshold", 0.05)
    if params.get("imputation_type"):
        setup_kwargs["imputation_type"] = params["imputation_type"]
    if params.get("ignore_features"):
        setup_kwargs["ignore_features"] = params["ignore_features"]
    if params.get("numeric_features"):
        setup_kwargs["numeric_features"] = params["numeric_features"]
    if params.get("categorical_features"):
        setup_kwargs["categorical_features"] = params["categorical_features"]

    exp = pc.setup(**setup_kwargs)

    # 결과 수집
    config = pc.get_config
    X_train = config("X_train")

    return {
        "transformed_shape": list(X_train.shape),
        "pipeline_steps": _extract_pipeline_steps(exp),
        "mlflow_experiment_id": pc.get_config("exp_id") if hasattr(pc, "get_config") else None,
    }


def _extract_pipeline_steps(exp) -> list[str]:
    """파이프라인 단계명 추출"""
    try:
        pipeline = exp.pipeline
        return [type(step).__name__ for _, step in pipeline.steps]
    except Exception:
        return ["전처리 파이프라인"]


# ── compare_models() ──────────────────────────────────────
async def compare_models_stream(
    experiment_id: int,
    module_type: str,
    options: dict,
) -> AsyncGenerator[dict, None]:
    """
    compare_models() 를 비동기 래퍼로 감싸 SSE 스트리밍
    각 모델 완료마다 yield
    """
    pc = _get_pycaret_module(module_type)

    compare_kwargs = {
        "sort": options.get("sort", "Accuracy"),
        "n_select": options.get("n_select", 3),
        "verbose": False,
    }
    if options.get("budget_time"):
        compare_kwargs["budget_time"] = options["budget_time"]
    if options.get("exclude"):
        compare_kwargs["exclude"] = options["exclude"]
    if options.get("include"):
        compare_kwargs["include"] = options["include"]

    # compare_models는 동기 함수 → 스레드에서 실행
    loop = asyncio.get_event_loop()
    best_models = await loop.run_in_executor(
        None,
        lambda: pc.compare_models(**compare_kwargs)
    )

    # 결과 pull
    results_df = pc.pull()

    for i, (idx, row) in enumerate(results_df.iterrows()):
        yield {
            "event": "model_result",
            "data": {
                "rank": i + 1,
                "algorithm": idx,
                "metrics": {
                    col: round(float(row[col]), 4)
                    for col in results_df.columns
                    if col not in ["TT (Sec)"]
                },
                "tt_sec": round(float(row.get("TT (Sec)", 0)), 2),
                "total_done": i + 1,
                "total_models": len(results_df),
            }
        }

    yield {
        "event": "done",
        "data": {
            "best_algorithm": results_df.index[0],
            "experiment_id": experiment_id,
        }
    }


# ── tune_model() ──────────────────────────────────────────
async def tune_model_stream(
    experiment_id: int,
    module_type: str,
    model_algorithm: str,
    tune_options: dict,
) -> AsyncGenerator[dict, None]:
    """
    tune_model() SSE 스트리밍
    Optuna trial 진행상황 yield
    """
    pc = _get_pycaret_module(module_type)

    # 먼저 모델 생성
    loop = asyncio.get_event_loop()
    base_model = await loop.run_in_executor(
        None,
        lambda: pc.create_model(model_algorithm, verbose=False)
    )

    before_metrics = pc.pull().loc[["Mean"]].to_dict("records")[0]

    tune_kwargs = {
        "estimator": base_model,
        "optimize": tune_options.get("optimize", "Accuracy"),
        "n_iter": tune_options.get("n_iter", 100),
        "early_stopping": tune_options.get("early_stopping", True),
        "choose_better": tune_options.get("choose_better", True),
        "verbose": False,
    }
    if tune_options.get("search_library"):
        tune_kwargs["search_library"] = tune_options["search_library"]

    # Optuna trial 콜백은 PyCaret 3에서 직접 지원하지 않으므로
    # tune_model 완료 후 결과를 한 번에 반환
    tuned_model = await loop.run_in_executor(
        None,
        lambda: pc.tune_model(**tune_kwargs)
    )

    after_metrics = pc.pull().loc[["Mean"]].to_dict("records")[0]

    # 하이퍼파라미터 추출
    before_params = base_model.get_params() if hasattr(base_model, "get_params") else {}
    after_params = tuned_model.get_params() if hasattr(tuned_model, "get_params") else {}

    changed_params = {
        k: {"before": before_params.get(k), "after": v}
        for k, v in after_params.items()
        if before_params.get(k) != v
    }

    yield {
        "event": "done",
        "data": {
            "before_metrics": {k: round(float(v), 4) for k, v in before_metrics.items() if isinstance(v, (int, float))},
            "after_metrics": {k: round(float(v), 4) for k, v in after_metrics.items() if isinstance(v, (int, float))},
            "changed_params": changed_params,
            "algorithm": model_algorithm,
        }
    }


# ── plot_model() ──────────────────────────────────────────
def get_plot(
    model,
    module_type: str,
    plot_type: str,
    use_train_data: bool = False,
) -> str:
    """
    plot_model() 실행 → base64 PNG 문자열 반환
    """
    pc = _get_pycaret_module(module_type)

    buf = io.BytesIO()
    pc.plot_model(
        model,
        plot=plot_type,
        use_train_data=use_train_data,
        save=True,        # 파일로 저장 후 읽기
        verbose=False,
    )

    # save된 이미지 파일 읽기
    import glob
    files = glob.glob(f"*.png")
    if files:
        with open(files[-1], "rb") as f:
            img_bytes = f.read()
        import os
        os.remove(files[-1])
        return base64.b64encode(img_bytes).decode("utf-8")
    return ""


# ── interpret_model() ─────────────────────────────────────
def get_shap(
    model,
    module_type: str,
    row_index: int = 0,
) -> dict:
    """
    interpret_model() SHAP Waterfall 데이터 반환
    """
    pc = _get_pycaret_module(module_type)

    # SHAP 값 계산
    pc.interpret_model(
        model,
        plot="reason",
        observation=row_index,
        use_train_data=False,
    )

    # SHAP 값 직접 추출
    import shap
    explainer = shap.TreeExplainer(model)
    X_test = pc.get_config("X_test")
    shap_values = explainer.shap_values(X_test.iloc[[row_index]])

    feature_names = X_test.columns.tolist()
    values = shap_values[0] if isinstance(shap_values, list) else shap_values[0]

    result = []
    for fname, fval in zip(feature_names, values):
        result.append({
            "feature": fname,
            "shap_value": round(float(fval), 4),
            "direction": "positive" if fval > 0 else "negative",
        })

    result.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
    return {"shap_values": result[:10]}  # 상위 10개


# ── finalize_model() ─────────────────────────────────────
def finalize_and_save(
    model,
    module_type: str,
    model_name: str,
    save_dir: str,
) -> dict:
    """
    finalize_model() + save_model()
    Returns: { model_path, final_metrics }
    """
    pc = _get_pycaret_module(module_type)

    final_model = pc.finalize_model(model)

    save_path = str(Path(save_dir) / model_name)
    pc.save_model(final_model, save_path)

    # 최종 성능 (전체 데이터 기준)
    if module_type in ("classification", "regression"):
        preds = pc.predict_model(final_model)
        metrics = pc.pull().to_dict("records")[0] if hasattr(pc, "pull") else {}
    else:
        metrics = {}

    return {
        "model_path": save_path + ".pkl",
        "final_metrics": {k: round(float(v), 4) for k, v in metrics.items() if isinstance(v, (int, float))},
    }


# ── predict_model() ──────────────────────────────────────
@lru_cache(maxsize=10)
def _load_model_cached(model_path: str):
    """모델 캐시 (최대 10개 메모리 유지)"""
    from pycaret.classification import load_model  # 실제로는 모듈 타입에 맞게 동적 로드
    return load_model(model_path.replace(".pkl", ""))


def predict_single(
    model_name: str,
    module_type: str,
    input_data: dict,
    threshold: float = 0.5,
) -> dict:
    """단건 예측"""
    pc = _get_pycaret_module(module_type)
    model_path = str(Path(settings.model_dir) / model_name)

    # 캐시에서 모델 로드
    try:
        model = _load_model_cached(model_path)
    except Exception:
        model = pc.load_model(model_path)

    df = pd.DataFrame([input_data])

    if module_type == "classification":
        result = pc.predict_model(model, data=df, probability_threshold=threshold)
        return {
            "label": str(result["Label"].iloc[0]),
            "score": round(float(result["Score"].iloc[0]), 4),
            "threshold": threshold,
        }
    elif module_type == "regression":
        result = pc.predict_model(model, data=df)
        return {
            "label": round(float(result["Label"].iloc[0]), 4),
            "score": None,
        }
    else:
        result = pc.predict_model(model, data=df)
        return {
            "label": str(result["Label"].iloc[0]) if "Label" in result.columns else "unknown",
            "score": float(result["Score"].iloc[0]) if "Score" in result.columns else None,
        }


def predict_batch(
    model_name: str,
    module_type: str,
    file_path: str,
    threshold: float = 0.5,
) -> list[dict]:
    """배치 예측"""
    pc = _get_pycaret_module(module_type)
    model_path = str(Path(settings.model_dir) / model_name)

    try:
        model = _load_model_cached(model_path)
    except Exception:
        model = pc.load_model(model_path)

    # 인코딩 자동 감지
    import chardet
    with open(file_path, "rb") as f:
        encoding = chardet.detect(f.read())["encoding"]

    df = pd.read_csv(file_path, encoding=encoding)

    if module_type == "classification":
        result = pc.predict_model(model, data=df, probability_threshold=threshold)
    else:
        result = pc.predict_model(model, data=df)

    return result.to_dict("records")
```

---

## 라우터 템플릿

### `backend/routers/train.py`
```python
import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models.experiment import Experiment
from models.trained_model import TrainedModel
from models.dataset import Dataset
from services import pycaret_service

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
    """PyCaret setup() 실행 및 Experiment DB 저장"""
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(404, "데이터셋을 찾을 수 없습니다")

    try:
        result = pycaret_service.run_setup(
            dataset_path=dataset.stored_path,
            module_type=req.module_type,
            params=req.params,
            mlflow_experiment_name=req.experiment_name,
        )
    except Exception as e:
        raise HTTPException(500, f"setup() 실패: {str(e)}")

    # DB 저장
    exp = Experiment(
        name=req.experiment_name,
        dataset_id=req.dataset_id,
        module_type=req.module_type,
        target_col=req.params.get("target_col"),
        setup_params=json.dumps(req.params),
        status="comparing",
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)

    return {
        "experiment_id": exp.id,
        "pipeline_steps": result["pipeline_steps"],
        "transformed_shape": result["transformed_shape"],
    }


@router.get("/setup/{experiment_id}/code")
def get_setup_code(experiment_id: int, db: Session = Depends(get_db)):
    """현재 setup 파라미터 → Python 코드 문자열 반환"""
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(404, "실험을 찾을 수 없습니다")

    params = json.loads(exp.setup_params)
    module_imports = {
        "classification": "from pycaret.classification import *",
        "regression": "from pycaret.regression import *",
        "clustering": "from pycaret.clustering import *",
        "anomaly": "from pycaret.anomaly import *",
        "timeseries": "from pycaret.time_series import *",
    }

    lines = [
        f"# PyCaret 3.0 — 자동 생성 코드",
        f"{module_imports[exp.module_type]}",
        "",
        "s = setup(",
        f"    data=df,",
    ]
    if exp.target_col:
        lines.append(f"    target='{exp.target_col}',")
    for k, v in params.items():
        if k not in ("target_col", "ignore_features", "numeric_features", "categorical_features"):
            if isinstance(v, str):
                lines.append(f"    {k}='{v}',")
            else:
                lines.append(f"    {k}={v},")
    lines.append(")")

    return {"code": "\n".join(lines)}


@router.post("/compare")
async def start_compare(req: CompareRequest, db: Session = Depends(get_db)):
    """compare_models() 시작"""
    exp = db.query(Experiment).filter(Experiment.id == req.experiment_id).first()
    if not exp:
        raise HTTPException(404, "실험을 찾을 수 없습니다")

    return {
        "message": "비교 시작",
        "stream_url": f"/api/train/compare/{req.experiment_id}/stream",
    }


@router.get("/compare/{experiment_id}/stream")
async def compare_stream(experiment_id: int, db: Session = Depends(get_db)):
    """compare_models() SSE 스트림"""
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(404, "실험을 찾을 수 없습니다")

    params = json.loads(exp.setup_params)

    async def event_generator():
        async for event in pycaret_service.compare_models_stream(
            experiment_id=experiment_id,
            module_type=exp.module_type,
            options=params.get("compare_options", {}),
        ):
            yield event

    return EventSourceResponse(event_generator())


@router.post("/finalize/{model_id}")
def finalize_model(model_id: int, db: Session = Depends(get_db)):
    """finalize_model() + save_model()"""
    trained = db.query(TrainedModel).filter(TrainedModel.id == model_id).first()
    if not trained:
        raise HTTPException(404, "모델을 찾을 수 없습니다")

    exp = db.query(Experiment).filter(Experiment.id == trained.experiment_id).first()

    # 실제로는 메모리에 있는 모델 객체를 사용해야 함
    # 여기서는 패턴만 보여줌
    raise HTTPException(501, "구현 필요: 학습 세션 관리 로직 추가")
```

### `backend/routers/predict.py`
```python
import json
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models.trained_model import TrainedModel
from models.prediction import Prediction
from services import pycaret_service
from config import settings

router = APIRouter()


class SinglePredictRequest(BaseModel):
    input_data: dict
    threshold: float = 0.5


@router.post("/{model_name}")
def predict_single(
    model_name: str,
    req: SinglePredictRequest,
    db: Session = Depends(get_db),
):
    """단건 예측"""
    # 모델 조회
    model_record = (
        db.query(TrainedModel)
        .filter(
            TrainedModel.mlflow_model_name == model_name,
            TrainedModel.stage == "Production",
        )
        .first()
    )
    if not model_record:
        raise HTTPException(404, f"Production 모델 '{model_name}'을 찾을 수 없습니다")

    from models.experiment import Experiment
    exp = db.query(Experiment).filter(Experiment.id == model_record.experiment_id).first()

    try:
        result = pycaret_service.predict_single(
            model_name=model_name,
            module_type=exp.module_type,
            input_data=req.input_data,
            threshold=req.threshold,
        )
    except Exception as e:
        raise HTTPException(500, f"예측 실패: {str(e)}")

    # 이력 저장
    pred = Prediction(
        model_id=model_record.id,
        model_name=model_name,
        source="manual",
        input_data=json.dumps(req.input_data),
        label=str(result["label"]),
        score=result.get("score"),
        threshold=req.threshold,
    )
    db.add(pred)
    model_record.pred_count_total += 1
    model_record.pred_count_today += 1
    db.commit()

    return result


@router.post("/{model_name}/batch")
async def predict_batch(
    model_name: str,
    file: UploadFile = File(...),
    threshold: float = 0.5,
    db: Session = Depends(get_db),
):
    """배치 예측 (CSV 업로드)"""
    # 임시 저장
    tmp_path = Path(settings.upload_dir) / f"batch_{file.filename}"
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    model_record = (
        db.query(TrainedModel)
        .filter(
            TrainedModel.mlflow_model_name == model_name,
            TrainedModel.stage == "Production",
        )
        .first()
    )
    if not model_record:
        raise HTTPException(404, f"Production 모델 '{model_name}'을 찾을 수 없습니다")

    from models.experiment import Experiment
    exp = db.query(Experiment).filter(Experiment.id == model_record.experiment_id).first()

    try:
        results = pycaret_service.predict_batch(
            model_name=model_name,
            module_type=exp.module_type,
            file_path=str(tmp_path),
            threshold=threshold,
        )
    except Exception as e:
        raise HTTPException(500, f"배치 예측 실패: {str(e)}")
    finally:
        tmp_path.unlink(missing_ok=True)

    # 배치 이력 저장 (요약)
    pred = Prediction(
        model_id=model_record.id,
        model_name=model_name,
        source="batch",
        input_data=json.dumps({"filename": file.filename, "row_count": len(results)}),
        label=f"배치 {len(results)}건",
    )
    db.add(pred)
    model_record.pred_count_total += len(results)
    model_record.pred_count_today += len(results)
    db.commit()

    return {"results": results, "total": len(results)}


@router.get("/history")
def get_history(limit: int = 100, db: Session = Depends(get_db)):
    """전체 예측 이력"""
    preds = (
        db.query(Prediction)
        .order_by(Prediction.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": p.id,
            "model_name": p.model_name,
            "source": p.source,
            "label": p.label,
            "score": p.score,
            "created_at": p.created_at.isoformat(),
        }
        for p in preds
    ]
```

---

## MLflow Service

### `backend/services/mlflow_service.py`
```python
import mlflow
from mlflow.tracking import MlflowClient
from config import settings


def get_client() -> MlflowClient:
    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
    return MlflowClient()


def register_model(run_id: str, model_name: str) -> dict:
    """MLflow 모델 레지스트리에 등록"""
    client = get_client()

    model_uri = f"runs:/{run_id}/model"
    registered = mlflow.register_model(model_uri, model_name)

    return {
        "name": registered.name,
        "version": registered.version,
        "status": registered.status,
    }


def transition_stage(model_name: str, version: int, stage: str, archive_existing: bool = True) -> dict:
    """스테이지 변경: None | Staging | Production | Archived"""
    client = get_client()

    client.transition_model_version_stage(
        name=model_name,
        version=str(version),
        stage=stage,
        archive_existing_versions=archive_existing and stage == "Production",
    )

    return {"name": model_name, "version": version, "stage": stage}


def get_all_registered_models() -> list[dict]:
    """등록된 모델 전체 목록"""
    client = get_client()
    models = []

    for rm in client.search_registered_models():
        latest_versions = client.get_latest_versions(rm.name, stages=["Production", "Staging", "None"])
        production = next((v for v in latest_versions if v.current_stage == "Production"), None)

        models.append({
            "name": rm.name,
            "description": rm.description or "",
            "latest_version": max((int(v.version) for v in latest_versions), default=0),
            "production_version": int(production.version) if production else None,
            "production_run_id": production.run_id if production else None,
            "creation_timestamp": rm.creation_timestamp,
        })

    return models


def get_version_history(model_name: str) -> list[dict]:
    """버전 히스토리"""
    client = get_client()
    versions = client.search_model_versions(f"name='{model_name}'")

    return sorted([
        {
            "version": int(v.version),
            "stage": v.current_stage,
            "run_id": v.run_id,
            "creation_timestamp": v.creation_timestamp,
        }
        for v in versions
    ], key=lambda x: x["version"], reverse=True)


def rollback_to_version(model_name: str, target_version: int) -> dict:
    """특정 버전으로 롤백 (해당 버전을 Production으로)"""
    client = get_client()

    # 현재 Production → Archived
    current = client.get_latest_versions(model_name, stages=["Production"])
    for v in current:
        client.transition_model_version_stage(model_name, v.version, "Archived")

    # 타겟 버전 → Production
    client.transition_model_version_stage(model_name, str(target_version), "Production")

    return {"model_name": model_name, "restored_version": target_version}


def get_mlflow_status() -> dict:
    """MLflow 서버 연결 상태"""
    try:
        client = get_client()
        experiments = client.search_experiments()
        return {
            "status": "connected",
            "uri": settings.mlflow_tracking_uri,
            "experiment_count": len(experiments),
        }
    except Exception as e:
        return {"status": "disconnected", "error": str(e)}
```

---

## 데이터 서비스

### `backend/services/data_service.py`
```python
import json
import chardet
import pandas as pd
from pathlib import Path
from config import settings


def process_upload(file_path: str, original_filename: str) -> dict:
    """
    업로드된 파일 처리:
    1. 인코딩 자동 감지
    2. DataFrame 로드
    3. parquet으로 저장
    4. 컬럼 메타데이터 추출
    """
    # 인코딩 감지
    with open(file_path, "rb") as f:
        raw = f.read(100_000)  # 첫 100KB만 감지
    encoding = chardet.detect(raw)["encoding"] or "utf-8"

    # 파일 로드
    suffix = Path(original_filename).suffix.lower()
    if suffix == ".csv":
        df = pd.read_csv(file_path, encoding=encoding)
    elif suffix in (".xlsx", ".xls"):
        df = pd.read_excel(file_path)
        encoding = "utf-8"
    else:
        raise ValueError(f"지원하지 않는 파일 형식: {suffix}")

    # parquet으로 저장
    stem = Path(original_filename).stem
    parquet_path = str(Path(settings.upload_dir) / f"{stem}.parquet")
    df.to_parquet(parquet_path, index=False)

    # 컬럼 메타데이터
    col_meta = []
    for col in df.columns:
        missing_count = df[col].isna().sum()
        dtype = df[col].dtype

        if pd.api.types.is_numeric_dtype(dtype):
            col_type = "numeric"
        elif pd.api.types.is_datetime64_any_dtype(dtype):
            col_type = "date"
        else:
            col_type = "categorical"

        col_meta.append({
            "name": col,
            "type": col_type,
            "missing_count": int(missing_count),
            "missing_pct": round(missing_count / len(df) * 100, 1),
            "unique_count": int(df[col].nunique()),
        })

    return {
        "stored_path": parquet_path,
        "encoding": encoding,
        "row_count": len(df),
        "col_count": len(df.columns),
        "col_meta": json.dumps(col_meta, ensure_ascii=False),
        "col_meta_list": col_meta,
        "duplicate_rows": int(df.duplicated().sum()),
    }


def get_preview(parquet_path: str, n: int = 50) -> dict:
    """상위 N행 미리보기"""
    df = pd.read_parquet(parquet_path)
    preview = df.head(n).fillna("").to_dict("records")
    return {
        "rows": preview,
        "total_rows": len(df),
    }
```
