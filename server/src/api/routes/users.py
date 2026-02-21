from fastapi import APIRouter, Depends, status
from src.schemas.user_schema import UserCreate, UserLogin, UserResponse

from src.services.user_service import UserService, get_user_service

router = APIRouter()

@router.post(
        "/register", 
        response_model=UserResponse, 
        status_code=status.HTTP_201_CREATED
    )
async def register_user(
    user_data: UserCreate, 
    user_service: UserService = Depends(get_user_service) 
):
    return await user_service.create_user(user_data)


@router.post(
        "/login", 
        response_model=UserResponse,
        status_code=status.HTTP_200_OK
    )
async def login_user(
    user_data: UserLogin,
    user_service: UserService = Depends(get_user_service)
):
    return await user_service.login_user(
        username=user_data.username, 
        password=user_data.password
    )