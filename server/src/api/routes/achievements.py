from fastapi import APIRouter, Depends

from src.auth.dependencies import get_current_user
from src.models import User
from src.schemas.achievement_schema import AchievementResponse, UserAchievementResponse
from src.services.achievement_service import AchievementService, get_achievement_service

router = APIRouter()


@router.get(
    "/",
    response_model=list[AchievementResponse],
)
async def get_all_achievements(
    current_user: User = Depends(get_current_user), # user to protect endpoint
    achievement_service: AchievementService = Depends(get_achievement_service),
) -> list[AchievementResponse]:
    return await achievement_service.get_all()


@router.get("/mine")
async def get_my_achievements(
    current_user: User = Depends(get_current_user),
    achievement_service: AchievementService = Depends(get_achievement_service),
) -> list[UserAchievementResponse]:
    return await achievement_service.get_mine(current_user)
