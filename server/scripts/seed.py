"""
Seed script for Sign-Learner database.
Seeds: Language (УЖМ), Gestures (А–Я), Lessons, Achievements.

Usage:
    cd server
    python scripts/seed.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from src.core.config import settings
from src.models.base import Base
from src.models.gestures_model import Language, Gesture
from src.models.lessons_model import Lesson
from src.models.achievements_model import Achievement

UKR_LETTERS = list("АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ")

ACHIEVEMENTS = [
    {"name": "Перший жест", "description": "Завершити перший урок"},
    {"name": "Десять жестів", "description": "Завершити 10 уроків"},
    {"name": "Стрік 3 дні", "description": "Тренуватися 3 дні поспіль"},
    {"name": "Тижнева серія", "description": "Тренуватися 7 днів поспіль"},
    {"name": "500 XP", "description": "Набрати 500 очок досвіду"},
]


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # Language
        result = await db.execute(select(Language).where(Language.code == "ukr"))
        lang = result.scalars().first()
        if not lang:
            lang = Language(name="Українська жестова мова", code="ukr")
            db.add(lang)
            await db.commit()
            await db.refresh(lang)
            print(f"✅ Language created: {lang.name}")
        else:
            print(f"⏭️  Language already exists: {lang.name}")

        # Gestures + Lessons
        for i, letter in enumerate(UKR_LETTERS, start=1):
            result = await db.execute(
                select(Gesture).where(
                    Gesture.language_id == lang.language_id,
                    Gesture.symbol == letter,
                )
            )
            gesture = result.scalars().first()

            if not gesture:
                gesture = Gesture(
                    language_id=lang.language_id,
                    symbol=letter,
                    complexity=1,
                )
                db.add(gesture)
                await db.commit()
                await db.refresh(gesture)
                print(f"  ✅ Gesture: {letter}")

                lesson = Lesson(
                    gesture_id=gesture.gesture_id,
                    title=f"Буква {letter}",
                    description=f"Навчись показувати букву {letter} українською жестовою мовою",
                    order=i,
                )
                db.add(lesson)
                await db.commit()
                print(f"  ✅ Lesson: {lesson.title}")
            else:
                print(f"  ⏭️  Gesture already exists: {letter}")

        # Achievements
        for ach_data in ACHIEVEMENTS:
            result = await db.execute(
                select(Achievement).where(Achievement.name == ach_data["name"])
            )
            existing = result.scalars().first()
            if not existing:
                ach = Achievement(
                    name=ach_data["name"],
                    description=ach_data["description"],
                )
                db.add(ach)
                await db.commit()
                print(f"  ✅ Achievement: {ach_data['name']}")
            else:
                print(f"  ⏭️  Achievement exists: {ach_data['name']}")

    await engine.dispose()
    print("\n🎉 Seed completed!")


if __name__ == "__main__":
    asyncio.run(seed())
