from fastapi import APIRouter, Depends, Query

from src.auth.dependencies import get_current_user
from src.models import User
from src.schemas.gesture_schema import GestureResponse
from src.services.gesture_service import GestureService, get_gesture_service

router = APIRouter()


@router.get(
    "/",
    response_model=list[GestureResponse],
)
async def get_gestures(
    language_code: str | None = Query(None, description="Filter by language code, e.g. 'ukr'"),
    current_user: User = Depends(get_current_user),
    gesture_service: GestureService = Depends(get_gesture_service),
) -> list[GestureResponse]:
    return await gesture_service.get_gestures(language_code)


@router.get(
    "/{gesture_id}",
    response_model=GestureResponse,
)
async def get_gesture(
    gesture_id: int,
    current_user: User = Depends(get_current_user),
    gesture_service: GestureService = Depends(get_gesture_service),
) -> GestureResponse:
    return await gesture_service.get_gesture_by_id(gesture_id)
