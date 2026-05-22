from fastapi import APIRouter, Depends

from src.auth.dependencies import get_current_user
from src.models import User
from src.schemas.practice_schema import (
    PracticeAttemptRequest,
    PracticeAttemptResponse,
    PracticeProgressResponse,
    PracticeSkipResponse,
)
from src.services.practice_service import PracticeService, get_practice_service

router = APIRouter()


@router.get(
    "/progress",
    response_model=list[PracticeProgressResponse],
)
async def get_practice_progress(
    current_user: User = Depends(get_current_user),
    practice_service: PracticeService = Depends(get_practice_service),
) -> list[PracticeProgressResponse]:
    return await practice_service.get_progress(current_user)


@router.post(
    "/{lesson_id}/attempt",
    response_model=PracticeAttemptResponse,
)
async def record_practice_attempt(
    lesson_id: int,
    data: PracticeAttemptRequest,
    current_user: User = Depends(get_current_user),
    practice_service: PracticeService = Depends(get_practice_service),
) -> PracticeAttemptResponse:
    return await practice_service.record_attempt(current_user, lesson_id, data)


@router.post(
    "/{lesson_id}/skip",
    response_model=PracticeSkipResponse,
)
async def skip_practice_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    practice_service: PracticeService = Depends(get_practice_service),
) -> PracticeSkipResponse:
    return await practice_service.skip_lesson(current_user, lesson_id)
