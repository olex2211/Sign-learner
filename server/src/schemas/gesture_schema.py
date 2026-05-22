from pydantic import BaseModel, ConfigDict

from src.models.gestures_model import GestureComplexity


class LanguageResponse(BaseModel):
    language_id: int
    name: str
    code: str

    model_config = ConfigDict(from_attributes=True)


class GestureResponse(BaseModel):
    gesture_id: int
    language_id: int
    symbol: str
    complexity: GestureComplexity

    model_config = ConfigDict(from_attributes=True)
