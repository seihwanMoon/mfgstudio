from contextlib import asynccontextmanager
from pathlib import Path

import mlflow as mlflow_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db
from routers import analyze, dashboard, data, drift, mlflow as mlflow_router, predict, registry, report, schedule, train
from services.scheduler import start_scheduler, stop_scheduler


def ensure_runtime_dirs() -> None:
    for path in (settings.upload_dir, settings.model_dir, settings.report_dir, "./mlruns"):
        Path(path).mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_runtime_dirs()
    init_db()
    mlflow_sdk.set_tracking_uri(settings.mlflow_tracking_uri)
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="Manufacturing AI Studio API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data.router, prefix="/api/data", tags=["data"])
app.include_router(mlflow_router.router, prefix="/api/mlflow", tags=["mlflow"])
app.include_router(train.router, prefix="/api/train", tags=["train"])
app.include_router(analyze.router, prefix="/api/analyze", tags=["analyze"])
app.include_router(predict.router, prefix="/api/predict", tags=["predict"])
app.include_router(registry.router, prefix="/api/registry", tags=["registry"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(drift.router, prefix="/api/drift", tags=["drift"])
app.include_router(schedule.router, prefix="/api/schedule", tags=["schedule"])
app.include_router(report.router, prefix="/api/report", tags=["report"])


@app.get("/health")
def health_check():
    return {"status": "ok", "mlflow": settings.mlflow_tracking_uri}
