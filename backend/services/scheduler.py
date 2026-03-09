from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from config import settings
from database import SessionLocal
from models.trained_model import TrainedModel
from services.drift_service import refresh_production_drifts


SCHEDULER = BackgroundScheduler(timezone="Asia/Seoul")
JOB_RUN_LOG: dict[str, dict] = {}


def run_weekly_drift_check() -> dict:
    db = SessionLocal()
    try:
        results = refresh_production_drifts(db)
        JOB_RUN_LOG["weekly_drift_check"] = {
            "status": "completed",
            "last_run": datetime.now().isoformat(),
            "summary": f"checked {len(results)} production models",
        }
        return {"checked_models": len(results), "results": results}
    finally:
        db.close()


def run_retrain_candidate_scan() -> dict:
    db = SessionLocal()
    try:
        models = (
            db.query(TrainedModel)
            .filter(
                TrainedModel.stage == "Production",
                TrainedModel.drift_score >= settings.drift_danger_threshold,
            )
            .all()
        )
        candidates = [
            {
                "model_name": model.mlflow_model_name,
                "version": model.mlflow_version,
                "drift_score": model.drift_score,
            }
            for model in models
        ]
        JOB_RUN_LOG["retrain_candidate_scan"] = {
            "status": "completed",
            "last_run": datetime.now().isoformat(),
            "summary": f"flagged {len(candidates)} retrain candidates",
        }
        return {"candidates": candidates}
    finally:
        db.close()


def ensure_default_jobs() -> None:
    if SCHEDULER.get_job("weekly_drift_check") is None:
        SCHEDULER.add_job(
            run_weekly_drift_check,
            trigger=CronTrigger(day_of_week="mon", hour=9, minute=0),
            id="weekly_drift_check",
            name="Weekly drift check",
            replace_existing=True,
        )
    if SCHEDULER.get_job("retrain_candidate_scan") is None:
        SCHEDULER.add_job(
            run_retrain_candidate_scan,
            trigger=CronTrigger(hour="*/6", minute=0),
            id="retrain_candidate_scan",
            name="Retrain candidate scan",
            replace_existing=True,
        )


def start_scheduler() -> None:
    if not SCHEDULER.running:
        SCHEDULER.start()
    ensure_default_jobs()


def stop_scheduler() -> None:
    if SCHEDULER.running:
        SCHEDULER.shutdown(wait=False)


def get_scheduler_jobs() -> list[dict]:
    ensure_default_jobs()
    rows = []
    for job in SCHEDULER.get_jobs():
        run_info = JOB_RUN_LOG.get(job.id, {})
        rows.append(
            {
                "id": job.id,
                "name": job.name,
                "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
                "status": "paused" if job.next_run_time is None else "active",
                "last_run": run_info.get("last_run"),
                "summary": run_info.get("summary", ""),
            }
        )
    return rows


def pause_job(job_id: str) -> dict:
    job = SCHEDULER.get_job(job_id)
    if job is None:
        raise KeyError(job_id)
    job.pause()
    return {"id": job_id, "status": "paused"}


def resume_job(job_id: str) -> dict:
    job = SCHEDULER.get_job(job_id)
    if job is None:
        raise KeyError(job_id)
    job.resume()
    return {"id": job_id, "status": "active"}


def run_job_now(job_id: str) -> dict:
    handlers = {
        "weekly_drift_check": run_weekly_drift_check,
        "retrain_candidate_scan": run_retrain_candidate_scan,
    }
    if job_id not in handlers:
        raise KeyError(job_id)
    result = handlers[job_id]()
    return {"id": job_id, "status": "completed", "result": result}
