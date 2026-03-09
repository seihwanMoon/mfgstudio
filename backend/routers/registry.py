from fastapi import APIRouter

from services.mlflow_service import get_all_registered_models

router = APIRouter()


@router.get("/models")
def list_registered_models():
    return get_all_registered_models()
