from fastapi import APIRouter
from src.api.routes import users

api_router = APIRouter()

api_router.include_router(users.router, prefix="/users", tags=["Users"])

# api_router.include_router(lessons.router, prefix="/lessons", tags=["Lessons"])