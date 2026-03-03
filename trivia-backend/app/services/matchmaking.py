import uuid
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert

from ..models.game_room import GameRoom
from ..core.redis import get_redis

ROOM_WAITING_TIMEOUT = 60  # seconds
MAX_PLAYERS_PER_ROOM = 10
MIN_PLAYERS_FOR_START = 2


async def find_or_create_room(user_id: int, category: str, db: AsyncSession) -> dict:
    """
    Find a waiting room in given category or create a new one.
    
    Returns:
        dict with room_id and status
    """
    redis_client = get_redis()
    
    # Search for waiting rooms in this category
    key_pattern = f"room_players:{category}:*"
    cursor = 0
    rooms_to_check = []
    
    # Scan all room player sets for this category
    while True:
        cursor, keys = await redis_client.scan(cursor, match=key_pattern)
        rooms_to_check.extend(keys)
        if cursor == 0:
            break
    
    # Check each room for availability
    for room_key in rooms_to_check:
        room_id = room_key.split(":")[-1]
        room_data_key = f"room:{room_id}"
        
        # Get room data
        room_data = await redis_client.hgetall(room_data_key)
        if not room_data:
            continue
        
        # Check if room is waiting and not full
        if room_data.get("status") == "waiting":
            player_count = await redis_client.scard(room_key)
            if player_count < MAX_PLAYERS_PER_ROOM:
                # Check if user already in room
                is_member = await redis_client.sismember(room_key, str(user_id))
                if not is_member:
                    # Add user to room
                    await redis_client.sadd(room_key, str(user_id))
                    return {
                        "room_id": room_id,
                        "status": "waiting",
                        "player_count": player_count + 1,
                    }
    
    # No suitable room found, create a new one
    room_id = str(uuid.uuid4())[:8].upper()
    room_key = f"room:{room_id}"
    room_players_key = f"room_players:{category}:{room_id}"
    
    # Store room data
    await redis_client.hset(
        room_key,
        mapping={
            "room_id": room_id,
            "category": category,
            "status": "waiting",
            "created_at": str(int(__import__("time").time())),
        },
    )
    
    # Add player to room
    await redis_client.sadd(room_players_key, str(user_id))
    
    # Set expiration
    await redis_client.expire(room_key, ROOM_WAITING_TIMEOUT * 2)
    await redis_client.expire(room_players_key, ROOM_WAITING_TIMEOUT * 2)
    
    # Optionally save to database for history
    new_room = GameRoom(room_code=room_id, category=category, status="waiting")
    db.add(new_room)
    await db.commit()
    
    return {
        "room_id": room_id,
        "status": "waiting",
        "player_count": 1,
    }


async def get_room_players(room_id: str) -> list[int]:
    """Get list of player IDs in a room."""
    redis_client = get_redis()
    
    # We need to find the correct key pattern
    cursor = 0
    while True:
        cursor, keys = await redis_client.scan(cursor, match=f"room_players:*:{room_id}")
        if keys:
            players = await redis_client.smembers(keys[0])
            return [int(p) for p in players]
        if cursor == 0:
            break
    
    return []


async def add_player_to_room(room_id: str, user_id: int):
    """Add a player to an existing room."""
    redis_client = get_redis()
    
    # Find the room players key
    cursor = 0
    while True:
        cursor, keys = await redis_client.scan(cursor, match=f"room_players:*:{room_id}")
        if keys:
            await redis_client.sadd(keys[0], str(user_id))
            return
        if cursor == 0:
            break


async def remove_player_from_room(room_id: str, user_id: int):
    """Remove a player from a room."""
    redis_client = get_redis()
    
    # Find the room players key
    cursor = 0
    while True:
        cursor, keys = await redis_client.scan(cursor, match=f"room_players:*:{room_id}")
        if keys:
            await redis_client.srem(keys[0], str(user_id))
            # If room is empty, delete it
            remaining = await redis_client.scard(keys[0])
            if remaining == 0:
                room_key = f"room:{room_id}"
                await redis_client.delete(room_key)
                await redis_client.delete(keys[0])
            return
        if cursor == 0:
            break
