from pydantic import BaseModel, ConfigDict, Field

from src.models.gestures_model import GestureComplexity, GestureMediaRole


class LanguageResponse(BaseModel):
    language_id: int
    name: str
    code: str

    model_config = ConfigDict(from_attributes=True)


class GestureMediaResponse(BaseModel):
    role: GestureMediaRole
    file_path: str


class GestureMediaBundleResponse(BaseModel):
    icon: GestureMediaResponse | None = None
    demo_image: GestureMediaResponse | None = None


class GestureResponse(BaseModel):
    gesture_id: int
    language_id: int
    symbol: str
    complexity: GestureComplexity
    media: GestureMediaBundleResponse = Field(default_factory=GestureMediaBundleResponse)

    model_config = ConfigDict(from_attributes=True)
