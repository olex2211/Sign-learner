from datetime import datetime

from pydantic import BaseModel, Field

from src.models.gestures_model import GestureComplexity
from src.models.lessons_model import LessonStatus
from src.models.practice_model import GestureProgressStatus


class PracticeProgressResponse(BaseModel):
    lesson_id: int
    gesture_id: int
    symbol: str
    complexity: GestureComplexity
    successful_attempts: int
    required_attempts: int
    status: GestureProgressStatus
    lesson_status: LessonStatus
    last_practiced_at: datetime | None = None


class PracticeAttemptRequest(BaseModel):
    predicted_gesture: str = Field(..., min_length=1)
    confidence: float = Field(..., ge=0, le=1)


class PracticeAttemptResponse(BaseModel):
    lesson_id: int
    gesture_id: int
    expected_gesture: str
    predicted_gesture: str
    confidence: float
    success: bool
    is_completed: bool
    successful_attempts: int
    required_attempts: int
    progress_status: GestureProgressStatus
    lesson_status: LessonStatus
    xp_earned: int
    attempt_xp_earned: int
    completion_bonus_xp: int
    message: str


class PracticeSkipResponse(BaseModel):
    lesson_id: int
    lesson_status: LessonStatus
    message: str
