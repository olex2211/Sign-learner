import enum
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, ForeignKey, Enum as SQLEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.gestures_model import Gesture
    from src.models.users_model import User
    from src.models.practice_model import UserGestureProgress

class MediaType(enum.Enum):
    PHOTO = "photo"
    GIF = "gif"
    VIDEO = "video"

class LessonStatus(enum.Enum):
    LOCKED = "locked"
    AVAILABLE = "available"
    PASSED = "passed"
    SKIPPED = "skipped"


class Lesson(Base):
    __tablename__ = "lessons"

    lesson_id: Mapped[int] = mapped_column(primary_key=True)
    gesture_id: Mapped[int] = mapped_column(ForeignKey("gestures.gesture_id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    order: Mapped[int] = mapped_column(default=0)

    gesture: Mapped["Gesture"] = relationship(back_populates="lessons")
    media_items: Mapped[list["Media"]] = relationship(back_populates="lesson", cascade="all, delete-orphan")
    user_progress: Mapped[list["UserLesson"]] = relationship(back_populates="lesson", cascade="all, delete-orphan")
    practice_progress: Mapped[list["UserGestureProgress"]] = relationship(back_populates="lesson", cascade="all, delete-orphan")


class Media(Base):
    __tablename__ = "media"

    media_id: Mapped[int] = mapped_column(primary_key=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.lesson_id", ondelete="CASCADE"))
    media_type: Mapped[MediaType] = mapped_column(SQLEnum(MediaType))
    file_path: Mapped[str] = mapped_column(String)
    
    lesson: Mapped["Lesson"] = relationship(back_populates="media_items")


class UserLesson(Base):
    __tablename__ = "user_lessons"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.lesson_id", ondelete="CASCADE"), primary_key=True)
    status: Mapped[LessonStatus] = mapped_column(SQLEnum(LessonStatus), default=LessonStatus.LOCKED)
    xp_earned: Mapped[int] = mapped_column(default=0)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="lessons_progress")
    lesson: Mapped["Lesson"] = relationship(back_populates="user_progress")
