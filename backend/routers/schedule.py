from fastapi import APIRouter, HTTPException

from services.scheduler import get_scheduler_jobs, pause_job, resume_job, run_job_now

router = APIRouter()


@router.get("/jobs")
def list_jobs():
    return {"jobs": get_scheduler_jobs()}


@router.put("/jobs/{job_id}/pause")
def pause_schedule_job(job_id: str):
    try:
        return pause_job(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Job not found") from exc


@router.put("/jobs/{job_id}/resume")
def resume_schedule_job(job_id: str):
    try:
        return resume_job(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Job not found") from exc


@router.post("/jobs/{job_id}/run")
def run_schedule_job(job_id: str):
    try:
        return run_job_now(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Job not found") from exc
