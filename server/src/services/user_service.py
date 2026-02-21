from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from src.db.database import get_db
from src.models import User
from src.schemas.user_schema import UserCreate
from src.auth.security import get_password_hash, verify_password

class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_username_or_email(self, username: str, email: str | None) -> User | None:
        if email == None:
            query = select(User).where(User.username == username)
        else:
            query = select(User).where(
                (User.email == email) | (User.username == username)
            )
        result = await self.db.execute(query)

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
        except Exception as e:
            await self.db.rollback()
            raise e
    
    async def login_user(self, username: str, password: str) -> User:
        user = await self.get_user_by_username_or_email(username=username, email=None)

        if not user or not verify_password(
            plain_password=password, 
            hashed_password=user.hashed_password
        ):
            raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )

        return user

def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(db)