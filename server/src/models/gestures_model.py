from typing import TYPE_CHECKING

from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.lessons_model import Lesson

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
    complexity: Mapped[int] = mapped_column(default=1)

    language: Mapped["Language"] = relationship(back_populates="gestures")
    lessons: Mapped[list["Lesson"]] = relationship(back_populates="gesture", cascade="all, delete-orphan")