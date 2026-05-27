from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.database import get_db
from src.models import Gesture, Language
from src.models.gestures_model import GestureMediaRole


class GestureService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_gestures(self, language_code: str | None = None) -> list[dict]:
        query = select(Gesture).options(selectinload(Gesture.media_items))

        if language_code:
            query = query.join(Language).where(Language.code == language_code)

        query = query.order_by(Gesture.symbol)
        result = await self.db.execute(query)
        return [self._to_response(gesture) for gesture in result.scalars().all()]

    async def get_gesture_by_id(self, gesture_id: int) -> dict:
        result = await self.db.execute(
            select(Gesture)
            .options(selectinload(Gesture.media_items))
            .where(Gesture.gesture_id == gesture_id)
        )
        gesture = result.scalars().first()

        if not gesture:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Gesture not found.",
            )

        return self._to_response(gesture)

    def _to_response(self, gesture: Gesture) -> dict:
        media = {
            "icon": None,
            "demo_image": None,
        }

        for item in gesture.media_items:
            payload = {
                "role": item.media_role.value,
                "file_path": item.file_path,
            }
            if item.media_role == GestureMediaRole.ICON:
                media["icon"] = payload
            elif item.media_role == GestureMediaRole.DEMO_IMAGE:
                media["demo_image"] = payload

        return {
            "gesture_id": gesture.gesture_id,
            "language_id": gesture.language_id,
            "symbol": gesture.symbol,
            "complexity": gesture.complexity,
            "media": media,
        }


def get_gesture_service(db: AsyncSession = Depends(get_db)) -> GestureService:
    return GestureService(db)
