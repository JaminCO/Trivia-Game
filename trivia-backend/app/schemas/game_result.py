from pydantic import BaseModel
from datetime import datetime


class GameResultResponse(BaseModel):
    id: int
    room_code: str
    user_id: int
    final_score: int
    rank: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True
