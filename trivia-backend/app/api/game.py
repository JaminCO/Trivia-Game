from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..api.auth import get_current_user
from ..schemas.user import UserResponse
from ..services.game_service import get_final_results

router = APIRouter(prefix="/game", tags=["game"])


@router.get("/{room_id}/results")
async def game_results(
    room_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Return final leaderboard for a completed game room."""
    results = await get_final_results(room_id, db)
    if not results:
        raise HTTPException(status_code=404, detail="No results found for this room")
    return {"room_id": room_id, "results": results}
