from fastapi import Depends, HTTPException, status
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from src.db.database import get_db
from src.models import User, UserAchievement
from src.schemas.user_schema import UserCreate, UserUpdate
from src.auth.security import get_password_hash, verify_password


def _calculate_level(xp: int) -> int:
    return xp // 100 + 1


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_username(self, username: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.username == username)
        )
        return result.scalars().first()

    async def get_user_by_username_or_email(self, username: str, email: str) -> User | None:
        result = await self.db.execute(
            select(User).where(
                (User.email == email) | (User.username == username)
            )
        )
        return result.scalars().first()

    async def create_user(self, user_data: UserCreate) -> User:
        existing_user = await self.get_user_by_username_or_email(
            username=user_data.username, 
            email=user_data.email
        )
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email or username already exists."
            )

        hashed_pw = get_password_hash(user_data.password)
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_pw
        )
        
        try:
            self.db.add(new_user)
            await self.db.commit()
            await self.db.refresh(new_user)
            return new_user
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Conflict: user already exists."
            )
    
    async def login_user(self, username: str, password: str) -> User:
        user = await self.get_user_by_username(username)

        if not user or not verify_password(
            plain_password=password, 
            hashed_password=user.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password."
            )

        return user

    async def update_me(self, user: User, data: UserUpdate) -> User:
        if data.username is not None:
            existing = await self.get_user_by_username(data.username)
            if existing and existing.user_id != user.user_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Username already taken.",
                )
            user.username = data.username

        if data.email is not None:
            user.email = data.email

        try:
            await self.db.commit()
            await self.db.refresh(user)
            return user
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already taken.",
            )

    async def get_stats(self, user: User) -> dict:
        result = await self.db.execute(
            select(sa_func.count()).select_from(UserAchievement).where(
                UserAchievement.user_id == user.user_id
            )
        )
        achievements_count = result.scalar() or 0

        return {
            "experience_points": user.experience_points,
            "current_streak": user.current_streak,
            "level": _calculate_level(user.experience_points),
            "achievements_count": achievements_count,
        }


def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(db)