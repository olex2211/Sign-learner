from pydantic import BaseModel, ConfigDict


class MediaResponse(BaseModel):
    media_id: int
    media_type: str
    file_path: str

    model_config = ConfigDict(from_attributes=True)


class LessonResponse(BaseModel):
    lesson_id: int
    gesture_id: int
    title: str
    description: str | None = None
    order: int
    status: str | None = None

    model_config = ConfigDict(from_attributes=True)


class LessonDetailResponse(LessonResponse):
    media_items: list[MediaResponse] = []


class ProgressResponse(BaseModel):
    xp_earned: int
    message: str
