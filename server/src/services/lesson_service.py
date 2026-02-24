from datetime import datetime, timezone, timedelta

from fastapi import Depends, HTTPException, status
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.database import get_db
from src.models import Lesson, UserLesson, User
from src.models.lessons_model import LessonStatus

XP_PER_LESSON = 50


class LessonService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_lessons(self, user: User) -> list[dict]:
        result = await self.db.execute(
            select(Lesson).order_by(Lesson.order)
        )
        lessons = result.scalars().all()

        progress_result = await self.db.execute(
            select(UserLesson).where(UserLesson.user_id == user.user_id)
        )
        progress_map = {
            ul.lesson_id: ul for ul in progress_result.scalars().all()
        }

        output = []
        for lesson in lessons:
            ul = progress_map.get(lesson.lesson_id)
            output.append({
                "lesson_id": lesson.lesson_id,
                "gesture_id": lesson.gesture_id,
                "title": lesson.title,
                "description": lesson.description,
                "order": lesson.order,
                "status": ul.status.value if ul else LessonStatus.AVAILABLE.value,
            })
        return output

    async def get_lesson(self, user: User, lesson_id: int) -> dict:
        result = await self.db.execute(
            select(Lesson)
            .options(selectinload(Lesson.media_items))
            .where(Lesson.lesson_id == lesson_id)
        )
        lesson = result.scalars().first()

        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lesson not found.",
            )

        ul_result = await self.db.execute(
            select(UserLesson).where(
                UserLesson.user_id == user.user_id,
                UserLesson.lesson_id == lesson_id,
            )
        )
        ul = ul_result.scalars().first()

        return {
            "lesson_id": lesson.lesson_id,
            "gesture_id": lesson.gesture_id,
            "title": lesson.title,
            "description": lesson.description,
            "order": lesson.order,
            "status": ul.status.value if ul else LessonStatus.AVAILABLE.value,
            "media_items": [
                {
                    "media_id": m.media_id,
                    "media_type": m.media_type.value,
                    "file_path": m.file_path,
                }
                for m in lesson.media_items
            ],
        }

    async def complete_lesson(self, user: User, lesson_id: int) -> dict:
        result = await self.db.execute(
            select(Lesson).where(Lesson.lesson_id == lesson_id)
        )
        lesson = result.scalars().first()

        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lesson not found.",
            )

        ul_result = await self.db.execute(
            select(UserLesson).where(
                UserLesson.user_id == user.user_id,
                UserLesson.lesson_id == lesson_id,
            )
        )
        ul = ul_result.scalars().first()

        if ul and ul.status == LessonStatus.PASSED:
            return {"xp_earned": 0, "message": "Lesson already completed."}

        if ul:
            ul.status = LessonStatus.PASSED
            ul.xp_earned = XP_PER_LESSON
        else:
            ul = UserLesson(
                user_id=user.user_id,
                lesson_id=lesson_id,
                status=LessonStatus.PASSED,
                xp_earned=XP_PER_LESSON,
            )
            self.db.add(ul)

        user.experience_points += XP_PER_LESSON
        self._update_streak(user)

        await self.db.commit()

        completed_count = await self._count_completed(user.user_id)
        from src.services.achievement_service import AchievementService
        ach_service = AchievementService(self.db)
        await ach_service.check_and_award(user, completed_count)
        await self.db.commit()

        return {"xp_earned": XP_PER_LESSON, "message": "Lesson completed!"}

    async def _count_completed(self, user_id: int) -> int:
        result = await self.db.execute(
            select(sa_func.count()).select_from(UserLesson).where(
                UserLesson.user_id == user_id,
                UserLesson.status == LessonStatus.PASSED,
            )
        )
        return result.scalar() or 0

    def _update_streak(self, user: User) -> None:
        now = datetime.now(timezone.utc)

        if user.last_active_at:
            diff = now.date() - user.last_active_at.date()
            if diff == timedelta(days=1):
                user.current_streak += 1
            elif diff > timedelta(days=1):
                user.current_streak = 1
        else:
            user.current_streak = 1

        user.last_active_at = now


def get_lesson_service(db: AsyncSession = Depends(get_db)) -> LessonService:
    return LessonService(db)
