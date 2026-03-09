import json
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.dataset import Dataset
from services.data_service import get_preview, process_upload

router = APIRouter()


class ColumnOverrideRequest(BaseModel):
    overrides: dict[str, str]


@router.post("/upload")
async def upload_data(file: UploadFile = File(...), db: Session = Depends(get_db)):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".csv", ".xlsx", ".xls"}:
        raise HTTPException(status_code=400, detail="지원하지 않는 파일 형식입니다")

    tmp_path = Path(settings.upload_dir) / f"upload_{file.filename}"
    with tmp_path.open("wb") as target:
        shutil.copyfileobj(file.file, target)

    try:
        result = process_upload(str(tmp_path), file.filename or tmp_path.name)
    finally:
        tmp_path.unlink(missing_ok=True)

    dataset = Dataset(
        filename=file.filename or tmp_path.name,
        stored_path=result["stored_path"],
        encoding=result["encoding"],
        row_count=result["row_count"],
        col_count=result["col_count"],
        col_meta=result["col_meta"],
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    return {
        "dataset_id": dataset.id,
        "filename": dataset.filename,
        "encoding": dataset.encoding,
        "columns": result["col_meta_list"],
    }


@router.get("/{dataset_id}/preview")
def preview_data(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="데이터셋을 찾을 수 없습니다")
    return get_preview(dataset.stored_path)


@router.get("/{dataset_id}/quality")
def get_quality(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="데이터셋을 찾을 수 없습니다")

    col_meta = json.loads(dataset.col_meta or "[]")
    return {
        "row_count": dataset.row_count,
        "col_count": dataset.col_count,
        "missing_cols": sum(1 for item in col_meta if item.get("missing_count", 0) > 0),
        "numeric_cols": sum(1 for item in col_meta if item.get("type") == "numeric"),
        "categorical_cols": sum(1 for item in col_meta if item.get("type") == "categorical"),
        "date_cols": sum(1 for item in col_meta if item.get("type") == "date"),
    }


@router.patch("/{dataset_id}/columns")
def update_columns(dataset_id: int, payload: ColumnOverrideRequest, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="데이터셋을 찾을 수 없습니다")

    current = json.loads(dataset.col_meta or "[]")
    updated = []
    for item in current:
        new_type = payload.overrides.get(item["name"])
        updated.append({**item, "type": new_type or item["type"]})

    dataset.col_meta = json.dumps(updated, ensure_ascii=False)
    db.commit()
    return {"dataset_id": dataset_id, "columns": updated}


@router.get("/list")
def list_datasets(db: Session = Depends(get_db)):
    datasets = db.query(Dataset).order_by(Dataset.created_at.desc()).all()
    return [
        {
            "id": item.id,
            "filename": item.filename,
            "row_count": item.row_count,
            "col_count": item.col_count,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in datasets
    ]
