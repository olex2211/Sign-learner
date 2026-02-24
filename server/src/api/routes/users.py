from fastapi import APIRouter, Depends

from src.auth.dependencies import get_current_user
from src.models import User
from src.schemas.user_schema import UserResponse, UserUpdate, UserStatsResponse
from src.services.user_service import UserService, get_user_service

router = APIRouter()


@router.get(
    "/me",
    response_model=UserResponse,
)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return current_user


@router.patch(
    "/me",
    response_model=UserResponse,
)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
) -> UserResponse:
    return await user_service.update_me(current_user, data)


@router.get(
    "/me/stats",
    response_model=UserStatsResponse,
)
async def get_stats(
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
) -> UserStatsResponse:
    return await user_service.get_stats(current_user)