from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.security import decode_access_token
from ..services.user_service import get_user_by_id
from ..services.matchmaking import get_room_players
from ..websocket.manager import manager

router = APIRouter()


async def get_user_from_token(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Resolve a user from a JWT token query parameter."""
    payload = decode_access_token(token)
    if payload is None or payload.get("sub") is None:
        return None
    user = await get_user_by_id(db, int(payload.get("sub")))
    return user


@router.websocket("/ws/room/{room_id}")
async def websocket_room(
    room_id: str,
    websocket: WebSocket,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    # authenticate
    user = await get_user_from_token(token, db)
    if user is None:
        # reject connection if token invalid
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(room_id, websocket)

    # broadcast that a new player joined
    await manager.broadcast(room_id, {"event": "player_joined", "user_id": user.id})

    # send current player list to everyone
    players = await get_room_players(room_id)
    await manager.broadcast(room_id, {"event": "players", "players": players})

    try:
        while True:
            data = await websocket.receive_json()
            evt = data.get("event")
            if evt == "ready":
                await manager.broadcast(room_id, {"event": "player_ready", "user_id": user.id})
            # add additional event handling as required
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)
        # remove from redis room set so matchmaking stays accurate
    from ..services.matchmaking import remove_player_from_room
    await remove_player_from_room(room_id, user.id)
    # broadcast updated player list after leaving
    players = await get_room_players(room_id)
    await manager.broadcast(room_id, {"event": "player_left", "user_id": user.id})
    await manager.broadcast(room_id, {"event": "players", "players": players})
