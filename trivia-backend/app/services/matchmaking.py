import uuid
import time
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.game_room import GameRoom
from ..core.redis import get_redis

ROOM_WAITING_TIMEOUT = 120  # seconds
MAX_PLAYERS_PER_ROOM = 10
MIN_PLAYERS_FOR_START = 2


async def find_or_create_room(user_id: int, category: str, db: AsyncSession) -> dict:
    """
    Find a waiting room in the given category or create a new one.

    Redis schema:
        room:{room_id}              ← hash: room metadata
        room_players:{room_id}      ← set: player user_ids
        category_rooms:{category}   ← set: active room_ids for a category
    """
    redis = get_redis()

    # Look for an available waiting room in this category
    room_ids = await redis.smembers(f"category_rooms:{category}")
    for room_id in room_ids:
        room_data = await redis.hgetall(f"room:{room_id}")
        if not room_data or room_data.get("status") != "waiting":
            continue

        player_count = await redis.scard(f"room_players:{room_id}")
        if player_count >= MAX_PLAYERS_PER_ROOM:
            continue

        already_in = await redis.sismember(f"room_players:{room_id}", str(user_id))
        if already_in:
            return {"room_id": room_id, "status": "waiting", "player_count": player_count}

        await redis.sadd(f"room_players:{room_id}", str(user_id))
        return {"room_id": room_id, "status": "waiting", "player_count": player_count + 1}

    # No suitable room found — create a new one
    room_id = str(uuid.uuid4())[:8].upper()

    await redis.hset(
        f"room:{room_id}",
        mapping={
            "room_id": room_id,
            "category": category,
            "status": "waiting",
            "created_at": str(int(time.time())),
        },
    )
    await redis.sadd(f"room_players:{room_id}", str(user_id))
    await redis.sadd(f"category_rooms:{category}", room_id)

    await redis.expire(f"room:{room_id}", ROOM_WAITING_TIMEOUT)
    await redis.expire(f"room_players:{room_id}", ROOM_WAITING_TIMEOUT)

    db.add(GameRoom(room_code=room_id, category=category, status="waiting"))
    await db.commit()

    return {"room_id": room_id, "status": "waiting", "player_count": 1}


async def get_room_players(room_id: str) -> list[int]:
    """Get list of player IDs in a room (direct O(1) lookup)."""
    redis = get_redis()
    members = await redis.smembers(f"room_players:{room_id}")
    return [int(m) for m in members]


async def add_player_to_room(room_id: str, user_id: int):
    """Add a player to an existing room."""
    redis = get_redis()
    await redis.sadd(f"room_players:{room_id}", str(user_id))


async def remove_player_from_room(room_id: str, user_id: int):
    """Remove a player from a room. Cleans up keys if the room becomes empty."""
    redis = get_redis()
    await redis.srem(f"room_players:{room_id}", str(user_id))
    remaining = await redis.scard(f"room_players:{room_id}")
    if remaining == 0:
        room_data = await redis.hgetall(f"room:{room_id}")
        category = room_data.get("category") if room_data else None
        await redis.delete(f"room:{room_id}", f"room_players:{room_id}")
        if category:
            await redis.srem(f"category_rooms:{category}", room_id)
