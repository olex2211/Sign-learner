from fastapi import APIRouter, Depends, HTTPException, status

from src.auth.jwt import create_access_token, create_refresh_token, decode_token
from src.schemas.auth_schema import Token, TokenRefreshRequest
from src.schemas.user_schema import UserCreate, UserLogin
from src.services.user_service import UserService, get_user_service

router = APIRouter()


@router.post(
    "/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    user_data: UserCreate,
    user_service: UserService = Depends(get_user_service),
) -> Token:
    user = await user_service.create_user(user_data)
    return Token(
        access_token=create_access_token(user.user_id),
        refresh_token=create_refresh_token(user.user_id),
    )


@router.post(
    "/login",
    response_model=Token,
)
async def login(
    user_data: UserLogin,
    user_service: UserService = Depends(get_user_service),
) -> Token:
    user = await user_service.login_user(
        username=user_data.username,
        password=user_data.password,
    )
    return Token(
        access_token=create_access_token(user.user_id),
        refresh_token=create_refresh_token(user.user_id),
    )


@router.post(
    "/refresh",
    response_model=Token,
)
async def refresh(body: TokenRefreshRequest) -> Token:
    token_data = decode_token(body.refresh_token)

    if token_data.type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Refresh token required.",
        )

    user_id = int(token_data.sub)
    return Token(
        access_token=create_access_token(user_id),
        refresh_token=body.refresh_token,
    )
