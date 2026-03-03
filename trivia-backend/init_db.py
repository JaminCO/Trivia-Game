#!/usr/bin/env python3
"""Initialize database tables."""
import asyncio
from app.core.database import engine
from app.models.user import Base as UserBase
from app.models.question import Base as QuestionBase
from app.models.game_room import Base as GameRoomBase
from app.models.game_result import Base as GameResultBase


async def init_db():
    """Create all database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(UserBase.metadata.create_all)
        await conn.run_sync(QuestionBase.metadata.create_all)
        await conn.run_sync(GameRoomBase.metadata.create_all)
        await conn.run_sync(GameResultBase.metadata.create_all)
    print("✅ Database tables created successfully!")


if __name__ == "__main__":
    asyncio.run(init_db())
