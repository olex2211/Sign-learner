from fastapi import APIRouter, Depends

from src.auth.dependencies import get_current_user
from src.models import User
from src.schemas.lesson_schema import LessonResponse, LessonDetailResponse, ProgressResponse
from src.services.lesson_service import LessonService, get_lesson_service

router = APIRouter()


@router.get(
    "/",
    response_model=list[LessonResponse],
)
async def get_lessons(
    current_user: User = Depends(get_current_user),
    lesson_service: LessonService = Depends(get_lesson_service),
) -> list[LessonResponse]:
    return await lesson_service.get_lessons(current_user)


@router.get(
    "/{lesson_id}",
    response_model=LessonDetailResponse,
)
async def get_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    lesson_service: LessonService = Depends(get_lesson_service),
) -> LessonDetailResponse:
    return await lesson_service.get_lesson(current_user, lesson_id)


@router.post(
    "/{lesson_id}/complete",
    response_model=ProgressResponse,
)
async def complete_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    lesson_service: LessonService = Depends(get_lesson_service),
) -> ProgressResponse:
    return await lesson_service.complete_lesson(current_user, lesson_id)
