from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.database import get_db
from src.models import User
from src.models.gestures_model import GestureComplexity
from src.models.lessons_model import Lesson, LessonStatus, UserLesson
from src.models.practice_model import GestureProgressStatus, UserGestureProgress
from src.schemas.practice_schema import PracticeAttemptRequest

CONFIDENCE_THRESHOLD = 0.75
XP_PER_SUCCESSFUL_ATTEMPT = 10
XP_COMPLETION_BONUS = 30

REQUIRED_ATTEMPTS_BY_COMPLEXITY = {
    GestureComplexity.EASY: 2,
    GestureComplexity.MEDIUM: 3,
    GestureComplexity.HARD: 4,
}


class PracticeService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_progress(self, user: User) -> list[dict]:
        lessons = await self._get_lessons_with_gestures()

        progress_result = await self.db.execute(
            select(UserGestureProgress).where(UserGestureProgress.user_id == user.user_id)
        )
        progress_map = {
            progress.lesson_id: progress
            for progress in progress_result.scalars().all()
        }

        lesson_status_result = await self.db.execute(
            select(UserLesson).where(UserLesson.user_id == user.user_id)
        )
        lesson_status_map = {
            progress.lesson_id: progress.status
            for progress in lesson_status_result.scalars().all()
        }

        return [
            self._build_progress_response(
                lesson=lesson,
                progress=progress_map.get(lesson.lesson_id),
                lesson_status=lesson_status_map.get(lesson.lesson_id, LessonStatus.AVAILABLE),
            )
            for lesson in lessons
        ]

    async def record_attempt(self, user: User, lesson_id: int, data: PracticeAttemptRequest) -> dict:
        lesson = await self._get_lesson_with_gesture(lesson_id)
        progress = await self._get_or_create_progress(user, lesson)
        user_lesson = await self._get_or_create_user_lesson(user, lesson_id)

        required_attempts = self.get_required_attempts(lesson.gesture.complexity)

        if progress.status == GestureProgressStatus.MASTERED:
            return self._build_attempt_response(
                lesson=lesson,
                data=data,
                progress=progress,
                user_lesson=user_lesson,
                required_attempts=required_attempts,
                success=True,
                attempt_xp=0,
                completion_bonus=0,
                message="Gesture is already mastered.",
            )

        success = (
            data.predicted_gesture == lesson.gesture.symbol
            and data.confidence >= CONFIDENCE_THRESHOLD
        )

        attempt_xp = 0
        completion_bonus = 0

        if success:
            progress.successful_attempts += 1
            progress.last_practiced_at = datetime.now(timezone.utc)
            progress.status = GestureProgressStatus.IN_PROGRESS
            user.experience_points += XP_PER_SUCCESSFUL_ATTEMPT
            user_lesson.xp_earned += XP_PER_SUCCESSFUL_ATTEMPT
            attempt_xp = XP_PER_SUCCESSFUL_ATTEMPT

            if progress.successful_attempts >= required_attempts:
                progress.successful_attempts = required_attempts
                progress.status = GestureProgressStatus.MASTERED
                if user_lesson.status != LessonStatus.PASSED:
                    user.experience_points += XP_COMPLETION_BONUS
                    user_lesson.xp_earned += XP_COMPLETION_BONUS
                    completion_bonus = XP_COMPLETION_BONUS
                user_lesson.status = LessonStatus.PASSED
                self._update_streak(user)
                await self.db.commit()

                completed_count = await self._count_completed(user.user_id)
                from src.services.achievement_service import AchievementService
                achievement_service = AchievementService(self.db)
                await achievement_service.check_and_award(user, completed_count)
                await self.db.commit()
            else:
                user_lesson.status = LessonStatus.AVAILABLE
                await self.db.commit()
        else:
            await self.db.commit()

        message = self._build_attempt_message(success, progress, required_attempts)

        return self._build_attempt_response(
            lesson=lesson,
            data=data,
            progress=progress,
            user_lesson=user_lesson,
            required_attempts=required_attempts,
            success=success,
            attempt_xp=attempt_xp,
            completion_bonus=completion_bonus,
            message=message,
        )

    async def skip_lesson(self, user: User, lesson_id: int) -> dict:
        await self._get_lesson_with_gesture(lesson_id)
        user_lesson = await self._get_or_create_user_lesson(user, lesson_id)
        if user_lesson.status != LessonStatus.PASSED:
            user_lesson.status = LessonStatus.SKIPPED
        await self.db.commit()
        return {
            "lesson_id": lesson_id,
            "lesson_status": user_lesson.status,
            "message": "Lesson skipped.",
        }

    @staticmethod
    def get_required_attempts(complexity: GestureComplexity) -> int:
        return REQUIRED_ATTEMPTS_BY_COMPLEXITY[complexity]

    async def _get_lessons_with_gestures(self) -> list[Lesson]:
        result = await self.db.execute(
            select(Lesson)
            .options(selectinload(Lesson.gesture))
            .order_by(Lesson.order)
        )
        return list(result.scalars().all())

    async def _get_lesson_with_gesture(self, lesson_id: int) -> Lesson:
        result = await self.db.execute(
            select(Lesson)
            .options(selectinload(Lesson.gesture))
            .where(Lesson.lesson_id == lesson_id)
        )
        lesson = result.scalars().first()
        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lesson not found.",
            )
        return lesson

    async def _get_or_create_progress(self, user: User, lesson: Lesson) -> UserGestureProgress:
        result = await self.db.execute(
            select(UserGestureProgress).where(
                UserGestureProgress.user_id == user.user_id,
                UserGestureProgress.lesson_id == lesson.lesson_id,
            )
        )
        progress = result.scalars().first()
        if progress:
            return progress

        progress = UserGestureProgress(
            user_id=user.user_id,
            lesson_id=lesson.lesson_id,
            gesture_id=lesson.gesture_id,
        )
        self.db.add(progress)
        await self.db.flush()
        return progress

    async def _get_or_create_user_lesson(self, user: User, lesson_id: int) -> UserLesson:
        result = await self.db.execute(
            select(UserLesson).where(
                UserLesson.user_id == user.user_id,
                UserLesson.lesson_id == lesson_id,
            )
        )
        user_lesson = result.scalars().first()
        if user_lesson:
            return user_lesson

        user_lesson = UserLesson(
            user_id=user.user_id,
            lesson_id=lesson_id,
            status=LessonStatus.AVAILABLE,
            xp_earned=0,
        )
        self.db.add(user_lesson)
        await self.db.flush()
        return user_lesson

    async def _count_completed(self, user_id: int) -> int:
        result = await self.db.execute(
            select(sa_func.count()).select_from(UserLesson).where(
                UserLesson.user_id == user_id,
                UserLesson.status == LessonStatus.PASSED,
            )
        )
        return result.scalar() or 0

    def _update_streak(self, user: User) -> None:
        from src.services.lesson_service import LessonService

        LessonService(self.db)._update_streak(user)

    def _build_progress_response(
        self,
        lesson: Lesson,
        progress: UserGestureProgress | None,
        lesson_status: LessonStatus,
    ) -> dict:
        return {
            "lesson_id": lesson.lesson_id,
            "gesture_id": lesson.gesture_id,
            "symbol": lesson.gesture.symbol,
            "complexity": lesson.gesture.complexity,
            "successful_attempts": progress.successful_attempts if progress else 0,
            "required_attempts": self.get_required_attempts(lesson.gesture.complexity),
            "status": progress.status if progress else GestureProgressStatus.NOT_STARTED,
            "lesson_status": lesson_status,
            "last_practiced_at": progress.last_practiced_at if progress else None,
        }

    def _build_attempt_response(
        self,
        lesson: Lesson,
        data: PracticeAttemptRequest,
        progress: UserGestureProgress,
        user_lesson: UserLesson,
        required_attempts: int,
        success: bool,
        attempt_xp: int,
        completion_bonus: int,
        message: str,
    ) -> dict:
        return {
            "lesson_id": lesson.lesson_id,
            "gesture_id": lesson.gesture_id,
            "expected_gesture": lesson.gesture.symbol,
            "predicted_gesture": data.predicted_gesture,
            "confidence": data.confidence,
            "success": success,
            "is_completed": progress.status == GestureProgressStatus.MASTERED,
            "successful_attempts": progress.successful_attempts,
            "required_attempts": required_attempts,
            "progress_status": progress.status,
            "lesson_status": user_lesson.status,
            "xp_earned": attempt_xp + completion_bonus,
            "attempt_xp_earned": attempt_xp,
            "completion_bonus_xp": completion_bonus,
            "message": message,
        }

    def _build_attempt_message(
        self,
        success: bool,
        progress: UserGestureProgress,
        required_attempts: int,
    ) -> str:
        if not success:
            return "Gesture was not recognized as the expected letter."
        if progress.status == GestureProgressStatus.MASTERED:
            return "Gesture mastered."
        return f"Gesture progress: {progress.successful_attempts}/{required_attempts}"


def get_practice_service(db: AsyncSession = Depends(get_db)) -> PracticeService:
    return PracticeService(db)
