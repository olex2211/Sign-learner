from fastapi import APIRouter, Depends, UploadFile, File

from src.auth.dependencies import get_current_user
from src.models import User
from src.services.ml_service import MLService, get_ml_service

router = APIRouter()


@router.post("/predict")
async def predict(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    ml_service: MLService = Depends(get_ml_service),
) -> dict:
    return await ml_service.predict(file)
