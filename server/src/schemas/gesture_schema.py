from pydantic import BaseModel, ConfigDict


class LanguageResponse(BaseModel):
    language_id: int
    name: str
    code: str

    model_config = ConfigDict(from_attributes=True)


class GestureResponse(BaseModel):
    gesture_id: int
    language_id: int
    symbol: str
    complexity: int

    model_config = ConfigDict(from_attributes=True)
