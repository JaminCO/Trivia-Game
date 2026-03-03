from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from . import Base


class GameResult(Base):
    __tablename__ = "game_results"

    id = Column(Integer, primary_key=True, index=True)
    room_code = Column(String(10), ForeignKey("game_rooms.room_code"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    final_score = Column(Integer, default=0)
    rank = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
