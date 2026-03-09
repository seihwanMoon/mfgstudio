# ARCHITECTURE — 시스템 아키텍처

---

## 전체 데이터 흐름

```
사용자 (브라우저)
    │  React + Vite (port 3000)
    │  Zustand 상태 관리
    │  Axios HTTP + SSE
    ▼
FastAPI Backend (port 8000)
    │
    ├─ routers/data.py         → services/data_service.py
    │                               chardet, pandas, parquet
    │
    ├─ routers/train.py        → services/pycaret_service.py
    │                               PyCaret 3.0 (setup/compare/tune/finalize)
    │                               SSE 스트리밍 (EventSourceResponse)
    │
    ├─ routers/analyze.py      → services/pycaret_service.py
    │                               plot_model(), interpret_model()
    │
    ├─ routers/predict.py      → services/pycaret_service.py
    │                               predict_model(), load_model()
    │                               모델 캐시 (LRU Cache)
    │
    ├─ routers/registry.py     → services/mlflow_service.py
    │                               mlflow.register_model()
    │                               MLflow Model Registry API
    │
    └─ services/mlflow_service.py ──→ MLflow Server (port 5000)
                                         로컬 ./mlruns 디렉토리
    │
    └─ database.py             → SQLite (./data/manufacturing_ai.db)
```

---

## DB 스키마 (SQLAlchemy ORM)

### Dataset 테이블
```sql
CREATE TABLE datasets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    filename     TEXT NOT NULL,                    -- 원본 파일명
    stored_path  TEXT NOT NULL,                    -- parquet 저장 경로
    encoding     TEXT DEFAULT 'utf-8',             -- chardet 감지 결과
    row_count    INTEGER,
    col_count    INTEGER,
    col_meta     TEXT,                             -- JSON: [{name, type, missing_pct}]
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Experiment 테이블
```sql
CREATE TABLE experiments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,                 -- 사용자 입력 실험명
    dataset_id      INTEGER REFERENCES datasets(id),
    module_type     TEXT NOT NULL,                 -- classification | regression | clustering | anomaly | timeseries
    target_col      TEXT,                          -- 분류/회귀만 사용
    setup_params    TEXT,                          -- JSON: setup() 파라미터 전체
    mlflow_exp_id   TEXT,                          -- MLflow experiment ID
    mlflow_exp_name TEXT,                          -- MLflow experiment name
    status          TEXT DEFAULT 'setup',          -- setup | comparing | tuning | done
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### TrainedModel 테이블
```sql
CREATE TABLE trained_models (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_id   INTEGER REFERENCES experiments(id),
    algorithm       TEXT NOT NULL,                 -- 'lightgbm', 'catboost' 등
    is_tuned        BOOLEAN DEFAULT 0,
    metrics         TEXT,                          -- JSON: {accuracy, auc, f1, ...}
    hyperparams     TEXT,                          -- JSON: {num_leaves, ...}
    model_path      TEXT,                          -- ./data/models/{name}.pkl
    mlflow_run_id   TEXT,
    mlflow_model_name TEXT,                        -- Registry 등록명
    mlflow_version  INTEGER,
    stage           TEXT DEFAULT 'None',           -- None | Staging | Production | Archived
    drift_score     REAL DEFAULT 0.0,              -- 0.0 ~ 1.0
    pred_count_total INTEGER DEFAULT 0,
    pred_count_today INTEGER DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Prediction 테이블
```sql
CREATE TABLE predictions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id    INTEGER REFERENCES trained_models(id),
    model_name  TEXT NOT NULL,
    source      TEXT DEFAULT 'manual',             -- manual | batch | realtime | scheduled
    input_data  TEXT,                              -- JSON
    label       TEXT,                             -- 예측 결과 레이블
    score       REAL,                             -- 확률 (분류) 또는 예측값 (회귀)
    threshold   REAL DEFAULT 0.5,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## API 전체 목록

### 데이터 API (`/api/data`)

| Method | Path | 설명 | PyCaret/라이브러리 |
|--------|------|------|-------------------|
| POST | `/api/data/upload` | CSV/Excel 업로드 | chardet + pandas |
| GET | `/api/data/{id}/preview` | 상위 50행 + 컬럼 타입 | pandas |
| GET | `/api/data/{id}/quality` | 품질 통계 (결측/중복) | pandas |
| PATCH | `/api/data/{id}/columns` | 컬럼 타입 강제 변경 | — |
| GET | `/api/data/list` | 업로드된 데이터셋 목록 | — |

### 학습 API (`/api/train`)

| Method | Path | 설명 | PyCaret |
|--------|------|------|---------|
| POST | `/api/train/setup` | 실험 설정 및 setup() 실행 | `setup()` |
| GET | `/api/train/setup/{id}/code` | Python 코드 문자열 반환 | — |
| GET | `/api/train/setup/{id}/result` | setup() 결과 요약 | `pull()` |
| POST | `/api/train/compare` | 전체 모델 비교 시작 | `compare_models()` |
| GET | `/api/train/compare/{id}/stream` | SSE 스트림 | EventSourceResponse |
| GET | `/api/train/compare/{id}/result` | 최종 리더보드 | `pull()` |
| GET | `/api/train/models` | 사용 가능 알고리즘 목록 | `models()` |
| POST | `/api/train/tune` | 하이퍼파라미터 튜닝 | `tune_model()` |
| GET | `/api/train/tune/{job_id}/stream` | Optuna trial SSE | EventSourceResponse |
| POST | `/api/train/ensemble` | 앙상블/블렌드/스택 | `blend_models()` / `stack_models()` |
| POST | `/api/train/finalize/{model_id}` | 모델 확정 + 저장 | `finalize_model()` + `save_model()` |

### 분석 API (`/api/analyze`)

| Method | Path | 설명 | PyCaret |
|--------|------|------|---------|
| POST | `/api/analyze/plot` | 플롯 이미지 생성 | `plot_model()` |
| POST | `/api/analyze/interpret` | SHAP 데이터 | `interpret_model()` |
| GET | `/api/analyze/plots/list` | 모듈별 플롯 목록 | — |

### 예측 API (`/api/predict`)

| Method | Path | 설명 | PyCaret |
|--------|------|------|---------|
| POST | `/api/predict/{model_name}` | 단건 예측 | `predict_model()` |
| POST | `/api/predict/{model_name}/batch` | 배치 예측 (CSV) | `predict_model()` |
| GET | `/api/predict/history` | 전체 예측 이력 | — |
| GET | `/api/predict/history/{model_name}` | 모델별 이력 | — |

### 레지스트리 API (`/api/registry`)

| Method | Path | 설명 | MLflow |
|--------|------|------|--------|
| POST | `/api/registry/register` | 모델 등록 | `mlflow.register_model()` |
| GET | `/api/registry/models` | 등록 모델 목록 | `MlflowClient.search_registered_models()` |
| GET | `/api/registry/{name}/versions` | 버전 히스토리 | `MlflowClient.get_latest_versions()` |
| PUT | `/api/registry/{name}/stage` | 스테이지 변경 | `MlflowClient.transition_model_version_stage()` |
| POST | `/api/registry/{name}/rollback` | 이전 버전 롤백 | 스테이지 전환 |

### 대시보드 API (`/api/dashboard`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/dashboard/models` | Production 모델 + 드리프트 + 오늘 예측 수 |
| GET | `/api/dashboard/stats` | 전체 통계 (모델 수, 총 예측 수, 알림 수) |

### 드리프트·스케줄 API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/drift/check/{model_name}` | 드리프트 점수 계산 |
| GET | `/api/schedule/jobs` | 스케줄 목록 |
| POST | `/api/schedule/jobs` | 스케줄 추가 |
| GET | `/api/report/{model_id}` | PDF 리포트 다운로드 |
| GET | `/api/mlflow/status` | MLflow 서버 연결 상태 |

---

## SSE 스트림 데이터 형식

### compare_models() 스트림

```jsonc
// 이벤트 타입: "model_result"
// 한 알고리즘 완료될 때마다 전송
{
  "event": "model_result",
  "data": {
    "rank": 1,
    "algorithm": "LightGBM",
    "metrics": {
      "Accuracy": 0.9241,
      "AUC": 0.9813,
      "F1": 0.8847,
      "Recall": 0.8632,
      "Precision": 0.9074,
      "TT_Sec": 2.14
    },
    "mlflow_run_id": "run_a2b3c4d",
    "total_done": 8,
    "total_models": 18
  }
}

// 완료 이벤트
{
  "event": "done",
  "data": { "best_algorithm": "LightGBM", "experiment_id": 1 }
}
```

### tune_model() 스트림

```jsonc
// 이벤트 타입: "trial"
// Optuna trial 완료마다 전송
{
  "event": "trial",
  "data": {
    "trial_number": 42,
    "value": 0.9387,
    "params": { "num_leaves": 127, "learning_rate": 0.032 },
    "is_best": true
  }
}
```

---

## 환경변수 (.env)

```bash
# ── Backend ──────────────────────────────────
DATABASE_URL=sqlite:///./data/manufacturing_ai.db
MLFLOW_TRACKING_URI=http://mlflow:5000
SECRET_KEY=change-this-in-production

# ── 파일 저장 경로 ──────────────────────────
UPLOAD_DIR=./data/uploads
MODEL_DIR=./data/models
REPORT_DIR=./data/reports

# ── 드리프트 임계값 ──────────────────────────
DRIFT_WARNING_THRESHOLD=0.2
DRIFT_DANGER_THRESHOLD=0.4

# ── 알림 (선택) ──────────────────────────────
KAKAO_REST_API_KEY=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# ── Frontend ─────────────────────────────────
VITE_API_BASE_URL=http://localhost:8000
VITE_SSE_BASE_URL=http://localhost:8000
```

---

## 모델 캐시 설계 (predict_model 성능)

```python
# services/pycaret_service.py
from functools import lru_cache
from pycaret.classification import load_model

# 모델별로 메모리 캐시 (최대 10개)
@lru_cache(maxsize=10)
def _load_model_cached(model_path: str):
    return load_model(model_path)

# 사용
def predict_single(model_name: str, data: dict):
    model_path = f"./data/models/{model_name}"
    model = _load_model_cached(model_path)
    df = pd.DataFrame([data])
    result = predict_model(model, data=df)
    return result[['Label', 'Score']].iloc[0].to_dict()
```

---

## PyCaret 모듈 타입 매핑

```python
MODULE_MAP = {
    "classification": {
        "import": "from pycaret.classification import *",
        "plots": ["auc", "confusion_matrix", "feature", "learning",
                  "pr", "calibration", "boundary", "lift", "gain", "class_report"],
        "metrics": ["Accuracy", "AUC", "Recall", "Precision", "F1", "Kappa", "MCC"],
        "sort_default": "Accuracy",
    },
    "regression": {
        "import": "from pycaret.regression import *",
        "plots": ["residuals", "error", "cooks", "rfe", "learning",
                  "feature", "feature_all", "parameter"],
        "metrics": ["MAE", "MSE", "RMSE", "R2", "RMSLE", "MAPE"],
        "sort_default": "R2",
    },
    "clustering": {
        "import": "from pycaret.clustering import *",
        "plots": ["cluster", "tsne", "elbow", "silhouette",
                  "distance", "distribution"],
        "metrics": [],  # 비지도 학습
        "sort_default": None,
    },
    "anomaly": {
        "import": "from pycaret.anomaly import *",
        "plots": ["tsne", "umap"],
        "metrics": [],  # 비지도 학습
        "sort_default": None,
    },
    "timeseries": {
        "import": "from pycaret.time_series import *",
        "plots": ["forecast", "residuals", "diagnostics", "insample",
                  "acf", "pacf", "decomp", "decomp_stl"],
        "metrics": ["MAE", "RMSE", "MAPE", "SMAPE", "R2"],
        "sort_default": "MAE",
    },
}
```

---

## Docker Compose 서비스 구성

```yaml
# docker-compose.yml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    volumes:
      - ./data:/app/data
      - ./mlruns:/app/mlruns
    environment:
      - MLFLOW_TRACKING_URI=http://mlflow:5000
    depends_on: [mlflow]

  frontend:
    build: ./frontend
ports: ["5173:3000"]
    depends_on: [backend]

  mlflow:
    image: ghcr.io/mlflow/mlflow:v2.11.0
    ports: ["5000:5000"]
    volumes:
      - ./mlruns:/mlruns
    command: >
      mlflow server
      --host 0.0.0.0
      --port 5000
      --backend-store-uri /mlruns
      --default-artifact-root /mlruns
```
