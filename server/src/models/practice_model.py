import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SQLEnum, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.gestures_model import Gesture
    from src.models.lessons_model import Lesson
    from src.models.users_model import User


class GestureProgressStatus(enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    MASTERED = "mastered"


class UserGestureProgress(Base):
    __tablename__ = "user_gesture_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="uq_user_gesture_progress_lesson"),
    )

    progress_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"))
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.lesson_id", ondelete="CASCADE"))
    gesture_id: Mapped[int] = mapped_column(ForeignKey("gestures.gesture_id", ondelete="CASCADE"))
    successful_attempts: Mapped[int] = mapped_column(default=0)
    status: Mapped[GestureProgressStatus] = mapped_column(
        SQLEnum(GestureProgressStatus),
        default=GestureProgressStatus.NOT_STARTED,
    )
    last_practiced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="gesture_progress")
    lesson: Mapped["Lesson"] = relationship(back_populates="practice_progress")
    gesture: Mapped["Gesture"] = relationship(back_populates="user_progress")
