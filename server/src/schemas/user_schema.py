from pydantic import BaseModel, EmailStr, ConfigDict, Field
from datetime import datetime

class UserBase(BaseModel):
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="unique username"
    ) 

class UserCreate(UserBase):
    password: str = Field(
        ..., 
        min_length=5, 
        description="Password (minimum 5 characters)"
    )

    email: EmailStr = Field(
        ..., 
        description="Email address"
    )

class UserLogin(UserBase):
    password: str = Field(
        ..., 
        min_length=5, 
        description="Password (minimum 5 characters)"
    )

class UserResponse(UserBase):
    user_id: int
    experience_points: int
    current_streak: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)