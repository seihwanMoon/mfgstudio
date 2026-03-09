# SETUP — 환경 구성 가이드

> 이 문서의 스크립트를 S-01 → S-05 순서로 실행하세요.
> 각 단계 완료 후 PROGRESS.md 체크박스를 업데이트하세요.

---

## S-01: 프로젝트 뼈대 생성

```bash
# 루트 폴더 생성
mkdir mfg-ai-studio && cd mfg-ai-studio

# 폴더 구조 생성
mkdir -p backend/routers backend/services backend/models
mkdir -p frontend/src
mkdir -p data/uploads data/models data/reports
mkdir -p mlruns
```

### `.gitignore`
```gitignore
# 환경변수
.env

# 런타임 데이터
data/
mlruns/

# Python
__pycache__/
*.pyc
*.pyo
.venv/
venv/

# Node
node_modules/
dist/

# 빌드 캐시
.cache/
```

### `.env.example`
```bash
# Backend
DATABASE_URL=sqlite:///./data/manufacturing_ai.db
MLFLOW_TRACKING_URI=http://mlflow:5000
SECRET_KEY=change-this-in-production-please

# 파일 경로
UPLOAD_DIR=./data/uploads
MODEL_DIR=./data/models
REPORT_DIR=./data/reports

# 드리프트 임계값
DRIFT_WARNING_THRESHOLD=0.2
DRIFT_DANGER_THRESHOLD=0.4

# 알림 (선택사항 — 비워도 작동)
KAKAO_REST_API_KEY=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Frontend
VITE_API_BASE_URL=http://localhost:8000
```

```bash
# .env 파일 생성
cp .env.example .env
```

---

## S-02: Docker 설정

### `docker-compose.yml`
```yaml
version: "3.9"

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
      - ./mlruns:/app/mlruns
    env_file: .env
    environment:
      - MLFLOW_TRACKING_URI=http://mlflow:5000
    depends_on:
      mlflow:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:3000"
    environment:
      - VITE_API_BASE_URL=http://localhost:8000
    depends_on:
      - backend
    restart: unless-stopped

  mlflow:
    image: ghcr.io/mlflow/mlflow:v2.11.0
    ports:
      - "5000:5000"
    volumes:
      - ./mlruns:/mlruns
    command: >
      mlflow server
      --host 0.0.0.0
      --port 5000
      --backend-store-uri /mlruns
      --default-artifact-root /mlruns
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
```

### `backend/Dockerfile`
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성 (WeasyPrint용)
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libffi-dev \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# data 디렉토리 생성
RUN mkdir -p /app/data/uploads /app/data/models /app/data/reports /app/mlruns

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

### `frontend/Dockerfile`
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json .
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
```

---

## S-03: Backend 초기화

### `backend/requirements.txt`
```txt
# Web Framework
fastapi==0.111.0
uvicorn[standard]==0.29.0
python-multipart==0.0.9
sse-starlette==2.1.0

# ML
pycaret[full]==3.3.2
mlflow==2.11.0

# Data
pandas==2.2.1
numpy==1.26.4
chardet==5.2.0
pyarrow==15.0.2

# DB
sqlalchemy==2.0.29
alembic==1.13.1

# Config
pydantic-settings==2.2.1
python-dotenv==1.0.1

# Drift
evidently==0.4.22

# Schedule
apscheduler==3.10.4

# Report
jinja2==3.1.3
weasyprint==61.2

# Utils
httpx==0.27.0
pillow==10.3.0
```

### `backend/config.py`
```python
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # DB
    database_url: str = "sqlite:///./data/manufacturing_ai.db"

    # MLflow
    mlflow_tracking_uri: str = "http://localhost:5000"

    # 파일 경로
    upload_dir: str = "./data/uploads"
    model_dir: str = "./data/models"
    report_dir: str = "./data/reports"

    # 드리프트 임계값
    drift_warning_threshold: float = 0.2
    drift_danger_threshold: float = 0.4

    # 보안
    secret_key: str = "dev-secret-key"

    class Config:
        env_file = ".env"


settings = Settings()
```

### `backend/database.py`
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False}  # SQLite용
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """앱 시작 시 테이블 생성"""
    from models import dataset, experiment, trained_model, prediction  # noqa
    Base.metadata.create_all(bind=engine)
```

### `backend/main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import mlflow

from config import settings
from database import init_db
from routers import data, train, analyze, predict, registry


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시
    init_db()
    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
    print(f"✅ DB 초기화 완료")
    print(f"✅ MLflow: {settings.mlflow_tracking_uri}")
    yield
    # 종료 시


app = FastAPI(
    title="Manufacturing AI Studio API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data.router, prefix="/api/data", tags=["data"])
app.include_router(train.router, prefix="/api/train", tags=["train"])
app.include_router(analyze.router, prefix="/api/analyze", tags=["analyze"])
app.include_router(predict.router, prefix="/api/predict", tags=["predict"])
app.include_router(registry.router, prefix="/api/registry", tags=["registry"])


@app.get("/health")
def health_check():
    return {"status": "ok", "mlflow": settings.mlflow_tracking_uri}
```

---

## S-04: Frontend 초기화

```bash
cd mfg-ai-studio

# Vite + React 프로젝트 생성
npm create vite@latest frontend -- --template react
cd frontend

# 패키지 설치
npm install

# 추가 패키지
npm install \
  zustand \
  axios \
  recharts \
  lucide-react \
  react-router-dom \
  react-dropzone \
  @tanstack/react-table

# TailwindCSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### `frontend/tailwind.config.js`
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy:  { DEFAULT: "#0B1929", mid: "#0F2035", card: "#0D1926" },
        cyan:  { DEFAULT: "#38BDF8" },
        green: { DEFAULT: "#34D399" },
        amber: { DEFAULT: "#FBBF24" },
        violet:{ DEFAULT: "#A78BFA" },
        red:   { DEFAULT: "#F87171" },
        muted: "#5A7A9A",
        border:"#1A3352",
      },
      fontFamily: {
        sans: ["DM Sans", "Malgun Gothic", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
```

### `frontend/src/api/client.js`
```js
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // PyCaret 학습은 오래 걸림
  headers: { "Content-Type": "application/json" },
});

// 응답 인터셉터 (에러 처리)
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    console.error("API Error:", err.response?.data || err.message);
    return Promise.reject(err.response?.data || err.message);
  }
);

// SSE 스트림 연결
export function createSSEStream(path, onMessage, onDone, onError) {
  const url = `${BASE_URL}${path}`;
  const source = new EventSource(url);

  source.onmessage = (e) => {
    const data = JSON.parse(e.data);
    onMessage(data);
  };

  source.addEventListener("done", (e) => {
    const data = JSON.parse(e.data);
    onDone(data);
    source.close();
  });

  source.onerror = (e) => {
    onError(e);
    source.close();
  };

  return () => source.close(); // cleanup 함수 반환
}
```

### `frontend/src/store/useStore.js`
```js
import { create } from "zustand";

const useStore = create((set, get) => ({
  // ── 현재 작업 흐름 ──────────────────────────
  currentDatasetId: null,
  currentExperimentId: null,
  currentModelId: null,
  currentStep: "home", // home|upload|setup|compare|tune|analyze|finalize|predict|mlflow

  setCurrentStep: (step) => set({ currentStep: step }),
  setDatasetId: (id) => set({ currentDatasetId: id }),
  setExperimentId: (id) => set({ currentExperimentId: id }),
  setModelId: (id) => set({ currentModelId: id }),

  // ── 데이터 업로드 ────────────────────────────
  uploadedDataset: null,
  columnOverrides: {},  // { colName: 'numeric' | 'categorical' | 'date' | 'ignore' }

  setUploadedDataset: (dataset) => set({ uploadedDataset: dataset }),
  setColumnOverride: (col, type) =>
    set((s) => ({ columnOverrides: { ...s.columnOverrides, [col]: type } })),

  // ── 실험 설정 ────────────────────────────────
  setupParams: {
    module_type: "classification",
    target_col: "",
    experiment_name: "",
    train_size: 0.8,
    fold: 10,
    session_id: 42,
    normalize: false,
    normalize_method: "zscore",
    fix_imbalance: false,
    remove_outliers: false,
    imputation_type: "simple",
    log_experiment: true,
    log_plots: true,
  },
  setSetupParam: (key, value) =>
    set((s) => ({ setupParams: { ...s.setupParams, [key]: value } })),

  // ── 모델 비교 ────────────────────────────────
  compareResults: [],         // 리더보드 행 배열
  compareOptions: {
    sort: "Accuracy",
    n_select: 3,
    budget_time: null,
    exclude: [],
  },
  addCompareResult: (row) =>
    set((s) => ({
      compareResults: [...s.compareResults, row].sort(
        (a, b) => b.metrics.Accuracy - a.metrics.Accuracy
      ),
    })),
  clearCompareResults: () => set({ compareResults: [] }),
  setCompareOption: (key, value) =>
    set((s) => ({ compareOptions: { ...s.compareOptions, [key]: value } })),
  selectedModelsForTune: [],
  toggleSelectModel: (runId) =>
    set((s) => ({
      selectedModelsForTune: s.selectedModelsForTune.includes(runId)
        ? s.selectedModelsForTune.filter((id) => id !== runId)
        : [...s.selectedModelsForTune, runId].slice(-3), // 최대 3개
    })),

  // ── 튜닝 ─────────────────────────────────────
  tuneTrials: [],             // Optuna trial 배열
  tuneResult: null,
  addTuneTrial: (trial) =>
    set((s) => ({ tuneTrials: [...s.tuneTrials, trial] })),
  clearTuneTrials: () => set({ tuneTrials: [] }),
  setTuneResult: (result) => set({ tuneResult: result }),

  // ── 운영 모델 ────────────────────────────────
  productionModels: [],
  setProductionModels: (models) => set({ productionModels: models }),
}));

export default useStore;
```

---

## S-05: MLflow 연동 확인

```bash
# MLflow 서버 단독 실행 (Docker 없이 테스트)
pip install mlflow
mlflow server --host 0.0.0.0 --port 5000

# 브라우저: http://localhost:5000 접속 확인
```

### `backend/services/mlflow_service.py` (연결 테스트용)
```python
import mlflow
from mlflow.tracking import MlflowClient
from config import settings


def get_mlflow_status() -> dict:
    """MLflow 서버 연결 상태 확인"""
    try:
        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        client = MlflowClient()
        experiments = client.search_experiments()
        return {
            "status": "connected",
            "uri": settings.mlflow_tracking_uri,
            "experiment_count": len(experiments),
        }
    except Exception as e:
        return {
            "status": "disconnected",
            "error": str(e),
            "uri": settings.mlflow_tracking_uri,
        }
```

```bash
# 전체 Docker 실행
docker-compose up --build

# 확인 체크리스트
# ✅ http://localhost:5173 — Frontend 정상
# ✅ http://localhost:8000/docs — FastAPI Swagger UI
# ✅ http://localhost:8000/health — { "status": "ok" }
# ✅ http://localhost:5000 — MLflow UI 정상
```
