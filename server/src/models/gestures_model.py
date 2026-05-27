import enum
from typing import TYPE_CHECKING

from sqlalchemy import String, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.lessons_model import Lesson
    from src.models.practice_model import UserGestureProgress


class GestureComplexity(enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class GestureMediaRole(enum.Enum):
    ICON = "icon"
    DEMO_IMAGE = "demo_image"


class Language(Base):
    __tablename__ = "languages"

    language_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    code: Mapped[str] = mapped_column(String(10), unique=True)

    gestures: Mapped[list["Gesture"]] = relationship(back_populates="language", cascade="all, delete-orphan")


class Gesture(Base):
    __tablename__ = "gestures"

    gesture_id: Mapped[int] = mapped_column(primary_key=True)
    language_id: Mapped[int] = mapped_column(ForeignKey("languages.language_id", ondelete="CASCADE"))
    symbol: Mapped[str] = mapped_column(String(50))
    complexity: Mapped[GestureComplexity] = mapped_column(
        SQLEnum(GestureComplexity),
        default=GestureComplexity.EASY,
    )

    language: Mapped["Language"] = relationship(back_populates="gestures")
    media_items: Mapped[list["GestureMedia"]] = relationship(back_populates="gesture", cascade="all, delete-orphan")
    lessons: Mapped[list["Lesson"]] = relationship(back_populates="gesture", cascade="all, delete-orphan")
    user_progress: Mapped[list["UserGestureProgress"]] = relationship(back_populates="gesture", cascade="all, delete-orphan")


class GestureMedia(Base):
    __tablename__ = "gesture_media"

    gesture_media_id: Mapped[int] = mapped_column(primary_key=True)
    gesture_id: Mapped[int] = mapped_column(ForeignKey("gestures.gesture_id", ondelete="CASCADE"))
    media_role: Mapped[GestureMediaRole] = mapped_column(SQLEnum(GestureMediaRole))
    file_path: Mapped[str] = mapped_column(String)

    gesture: Mapped["Gesture"] = relationship(back_populates="media_items")
