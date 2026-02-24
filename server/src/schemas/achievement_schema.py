from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AchievementResponse(BaseModel):
    achievement_id: int
    name: str
    description: str | None = None
    icon_path: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UserAchievementResponse(BaseModel):
    achievement_id: int
    name: str
    description: str | None = None
    icon_path: str | None = None
    earned_at: datetime

    model_config = ConfigDict(from_attributes=True)
