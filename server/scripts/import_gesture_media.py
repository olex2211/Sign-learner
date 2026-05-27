"""
Import gesture icon and demo images into backend media storage.

Expected source folders from the project root or from explicit env vars:
    server/assets/gestures/ukr/icon/<symbol>.png
    server/assets/gestures/ukr/demo/<symbol>.png

Target storage:
    server/media/gestures/ukr/icon/<symbol>.png
    server/media/gestures/ukr/demo/<symbol>.png

Usage:
    python server/scripts/import_gesture_media.py

Optional env vars:
    GESTURE_ICON_DIR=/source/icon
    GESTURE_DEMO_DIR=/source/demo
"""
import asyncio
import os
import shutil
import sys
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.config import settings
from src.models.gestures_model import Gesture, GestureMedia, GestureMediaRole, Language


SERVER_ROOT = Path(__file__).resolve().parents[1]
MEDIA_ROOT = SERVER_ROOT / "media"
ASSET_ROOT = SERVER_ROOT / "assets" / "gestures" / "ukr"


def source_dir(env_var: str, default_path: Path) -> Path:
    return Path(os.getenv(env_var) or default_path)


SOURCE_DIRS = {
    GestureMediaRole.ICON: source_dir(
        "GESTURE_ICON_DIR",
        ASSET_ROOT / "icon",
    ),
    GestureMediaRole.DEMO_IMAGE: source_dir(
        "GESTURE_DEMO_DIR",
        ASSET_ROOT / "demo",
    ),
}

TARGET_DIRS = {
    GestureMediaRole.ICON: MEDIA_ROOT / "gestures" / "ukr" / "icon",
    GestureMediaRole.DEMO_IMAGE: MEDIA_ROOT / "gestures" / "ukr" / "demo",
}

RELATIVE_PREFIXES = {
    GestureMediaRole.ICON: "/media/gestures/ukr/icon",
    GestureMediaRole.DEMO_IMAGE: "/media/gestures/ukr/demo",
}

SUPPORTED_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp")


def find_source_file(source_dir: Path, symbol: str) -> Path | None:
    for extension in SUPPORTED_EXTENSIONS:
        candidate = source_dir / f"{symbol}{extension}"
        if candidate.exists():
            return candidate
    return None


async def upsert_media(
    db: AsyncSession,
    gesture: Gesture,
    role: GestureMediaRole,
    source_file: Path,
) -> None:
    target_dir = TARGET_DIRS[role]
    target_dir.mkdir(parents=True, exist_ok=True)

    target_file = target_dir / f"{gesture.symbol}{source_file.suffix.lower()}"
    shutil.copy2(source_file, target_file)

    file_path = f"{RELATIVE_PREFIXES[role]}/{target_file.name}"

    result = await db.execute(
        select(GestureMedia).where(
            GestureMedia.gesture_id == gesture.gesture_id,
            GestureMedia.media_role == role,
        )
    )
    media = result.scalars().first()

    if media:
        media.file_path = file_path
    else:
        db.add(
            GestureMedia(
                gesture_id=gesture.gesture_id,
                media_role=role,
                file_path=file_path,
            )
        )

    print(f"{gesture.symbol}: {role.value} -> {file_path}")


async def import_gesture_media() -> None:
    for source_dir in SOURCE_DIRS.values():
        if not source_dir.exists():
            raise FileNotFoundError(f"Source directory not found: {source_dir}")

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        language_result = await db.execute(select(Language).where(Language.code == "ukr"))
        language = language_result.scalars().first()

        if not language:
            raise RuntimeError("Language with code 'ukr' was not found. Run the seed script first.")

        gestures_result = await db.execute(
            select(Gesture)
            .where(Gesture.language_id == language.language_id)
            .order_by(Gesture.symbol)
        )
        gestures = list(gestures_result.scalars().all())

        if not gestures:
            raise RuntimeError("No Ukrainian gestures found. Run the seed script first.")

        for gesture in gestures:
            for role, source_dir in SOURCE_DIRS.items():
                source_file = find_source_file(source_dir, gesture.symbol)
                if not source_file:
                    print(f"{gesture.symbol}: missing {role.value} source file")
                    continue

                await upsert_media(db, gesture, role, source_file)

        await db.commit()

    await engine.dispose()
    print("Gesture media import completed.")


if __name__ == "__main__":
    asyncio.run(import_gesture_media())
