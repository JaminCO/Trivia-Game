#!/usr/bin/env python3
"""Initialize database tables."""
import asyncio
from sqlalchemy import text
from app.core.database import engine
from app.models.user import Base as UserBase
from app.models.question import Base as QuestionBase
from app.models.game_room import Base as GameRoomBase
from app.models.game_result import Base as GameResultBase


async def init_db():
    """Create all database tables and add any missing columns.

    Running `metadata.create_all` will create tables that don't exist but
    won't modify existing tables.  We therefore follow up with explicit
    ALTER statements to ensure the `users` table has the new columns added
    later in development (profile_picture and coins).
    """
    async with engine.begin() as conn:
        # create any missing tables
        await conn.run_sync(UserBase.metadata.create_all)
        await conn.run_sync(QuestionBase.metadata.create_all)
        await conn.run_sync(GameRoomBase.metadata.create_all)
        await conn.run_sync(GameResultBase.metadata.create_all)

        # ensure new columns are present on existing users table
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255) DEFAULT 'default_profile.png';"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;"))

    print("✅ Database tables created or updated successfully!")


if __name__ == "__main__":
    asyncio.run(init_db())
