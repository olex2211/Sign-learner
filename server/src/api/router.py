from fastapi import APIRouter
from src.api.routes import auth, users, gestures, lessons, achievements, ml

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(gestures.router, prefix="/gestures", tags=["Gestures"])
api_router.include_router(lessons.router, prefix="/lessons", tags=["Lessons"])
api_router.include_router(achievements.router, prefix="/achievements", tags=["Achievements"])
api_router.include_router(ml.router, prefix="/ml", tags=["ML"])