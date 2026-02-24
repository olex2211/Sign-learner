from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.models import Achievement, UserAchievement, User

from src.schemas.achievement_schema import UserAchievementResponse

# TODO: implement this in Database
ACHIEVEMENT_TRIGGERS = {
    "first_lesson": {"name": "Перший жест", "description": "Завершити перший урок", "check": lambda stats: stats["completed"] >= 1},
    "ten_lessons": {"name": "Десять жестів", "description": "Завершити 10 уроків", "check": lambda stats: stats["completed"] >= 10},
    "streak_3": {"name": "Стрік 3 дні", "description": "Тренуватися 3 дні поспіль", "check": lambda stats: stats["streak"] >= 3},
    "streak_7": {"name": "Тижнева серія", "description": "Тренуватися 7 днів поспіль", "check": lambda stats: stats["streak"] >= 7},
    "xp_500": {"name": "500 XP", "description": "Набрати 500 очок досвіду", "check": lambda stats: stats["xp"] >= 500},
}


class AchievementService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> list[Achievement]:
        result = await self.db.execute(
            select(Achievement).order_by(Achievement.achievement_id)
        )
        return list(result.scalars().all())

    async def get_mine(self, user: User) -> list["UserAchievementResponse"]:
        result = await self.db.execute(
            select(UserAchievement, Achievement)
            .join(Achievement, UserAchievement.achievement_id == Achievement.achievement_id)
            .where(UserAchievement.user_id == user.user_id)
            .order_by(UserAchievement.earned_at.desc())
        )
        rows = result.all()

        return [
            UserAchievementResponse(
                achievement_id=ach.achievement_id,
                name=ach.name,
                description=ach.description,
                icon_path=ach.icon_path,
                earned_at=ua.earned_at,
            )
            for ua, ach in rows
        ]

    async def check_and_award(self, user: User, completed_lessons: int) -> None:
        earned_result = await self.db.execute(
            select(UserAchievement.achievement_id).where(
                UserAchievement.user_id == user.user_id
            )
        )
        earned_ids = set(earned_result.scalars().all())

        all_result = await self.db.execute(select(Achievement))
        all_achievements = {a.name: a for a in all_result.scalars().all()}

        stats = {
            "completed": completed_lessons,
            "streak": user.current_streak,
            "xp": user.experience_points,
        }

        for key, trigger in ACHIEVEMENT_TRIGGERS.items():
            ach = all_achievements.get(trigger["name"])
            if ach and ach.achievement_id not in earned_ids and trigger["check"](stats):
                self.db.add(UserAchievement(
                    user_id=user.user_id,
                    achievement_id=ach.achievement_id,
                ))


def get_achievement_service(db: AsyncSession = Depends(get_db)) -> AchievementService:
    return AchievementService(db)
