from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.redis import get_redis
from ..api.auth import get_current_user
from ..schemas.user import UserResponse
from ..services.matchmaking import find_or_create_room

router = APIRouter(prefix="/matchmaking", tags=["matchmaking"])


class MatchmakingRequest(BaseModel):
    category: str


class MatchmakingResponse(BaseModel):
    room_id: str
    status: str
    player_count: int


@router.post("/join", response_model=MatchmakingResponse)
async def join_matchmaking(
    request: MatchmakingRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Join a matchmaking queue for a specific category.
    Returns room_id if a room was found or created.
    """
    try:
        result = await find_or_create_room(current_user.id, request.category, db)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to join matchmaking: {str(e)}",
        )
