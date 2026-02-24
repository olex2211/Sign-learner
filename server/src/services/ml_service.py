import httpx
from fastapi import Depends, HTTPException, UploadFile, status

from src.core.config import settings


class MLService:
    async def predict(self, image: UploadFile) -> dict:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{settings.ML_SERVICE_URL}/predict",
                    files={"file": (image.filename, await image.read(), image.content_type)},
                )
                response.raise_for_status()
                return response.json()
        except httpx.ConnectError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="ML service is unavailable.",
            )
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail="ML service error.",
            )


def get_ml_service() -> MLService:
    return MLService()
