from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.database import get_db
from src.models import Gesture, Language


class GestureService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_gestures(self, language_code: str | None = None) -> list[Gesture]:
        query = select(Gesture)

        if language_code:
            query = query.join(Language).where(Language.code == language_code)

        query = query.order_by(Gesture.symbol)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_gesture_by_id(self, gesture_id: int) -> Gesture:
        result = await self.db.execute(
            select(Gesture).where(Gesture.gesture_id == gesture_id)
        )
        gesture = result.scalars().first()

        if not gesture:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Gesture not found.",
            )

        return gesture


def get_gesture_service(db: AsyncSession = Depends(get_db)) -> GestureService:
    return GestureService(db)
