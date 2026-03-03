from sqlalchemy import Column, Integer, String, DateTime, JSON
from datetime import datetime
from . import Base


class GameRoom(Base):
    __tablename__ = "game_rooms"

    id = Column(Integer, primary_key=True, index=True)
    room_code = Column(String(10), unique=True, index=True, nullable=False)
    category = Column(String(100), nullable=False)
    status = Column(String(20), default="waiting")  # waiting, in_progress, finished
    created_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
    player_count = Column(Integer, default=0)
