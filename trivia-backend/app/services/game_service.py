import json
import time
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert

from ..core.redis import get_redis
from ..models.game_result import GameResult
from ..models.game_room import GameRoom
from ..models.user import User


BASE_SCORE = 1000
MAX_SPEED_BONUS = 500
QUESTION_TIME_LIMIT = 30  # seconds


async def start_game(room_id: str):
    """Initialize game state in Redis."""
    redis_client = get_redis()
    await redis_client.hset(
        f"game:{room_id}",
        mapping={
            "current_question_index": "0",
            "status": "active",
            "start_time": str(int(time.time())),
        },
    )
    await redis_client.expire(f"game:{room_id}", 7200)


async def get_game_state(room_id: str) -> dict | None:
    redis_client = get_redis()
    data = await redis_client.hgetall(f"game:{room_id}")
    if not data:
        return None
    return {
        "current_question_index": int(data.get("current_question_index", 0)),
        "status": data.get("status", "unknown"),
    }


async def submit_answer(
    room_id: str,
    user_id: int,
    question_index: int,
    answer: str,
    elapsed_seconds: float,
) -> dict:
    """
    Store a player's answer. Returns score awarded.
    Prevents duplicate submissions.
    """
    redis_client = get_redis()
    answer_key = f"answers:{room_id}:{question_index}"

    # Prevent double-submit
    already_answered = await redis_client.hexists(answer_key, str(user_id))
    if already_answered:
        return {"already_answered": True, "score_awarded": 0}

    # Get questions to check correct answer
    questions_raw = await redis_client.get(f"game:{room_id}:questions")
    if not questions_raw:
        return {"error": "game not found", "score_awarded": 0}

    questions = json.loads(questions_raw)
    if question_index >= len(questions):
        return {"error": "invalid question index", "score_awarded": 0}

    correct = questions[question_index]["correct_answer"].upper()
    is_correct = answer.upper() == correct

    # Calculate score
    score_awarded = 0
    if is_correct:
        seconds_taken = max(0, min(elapsed_seconds, QUESTION_TIME_LIMIT))
        speed_bonus = int((QUESTION_TIME_LIMIT - seconds_taken) / QUESTION_TIME_LIMIT * MAX_SPEED_BONUS)
        score_awarded = BASE_SCORE + speed_bonus

    # Store answer with timestamp
    await redis_client.hset(
        answer_key,
        str(user_id),
        json.dumps({"answer": answer.upper(), "score": score_awarded, "correct": is_correct}),
    )
    await redis_client.expire(answer_key, 7200)

    # Update running score
    scores_key = f"scores:{room_id}"
    await redis_client.hincrby(scores_key, str(user_id), score_awarded)
    await redis_client.expire(scores_key, 7200)

    return {"already_answered": False, "score_awarded": score_awarded, "correct": is_correct}


async def get_leaderboard(room_id: str, db: AsyncSession) -> list[dict]:
    """Return sorted leaderboard with usernames."""
    redis_client = get_redis()
    scores_raw = await redis_client.hgetall(f"scores:{room_id}")

    if not scores_raw:
        return []

    # Fetch usernames
    user_ids = [int(uid) for uid in scores_raw.keys()]
    result = await db.execute(select(User).where(User.id.in_(user_ids)))
    users = {u.id: u.username for u in result.scalars().all()}

    leaderboard = [
        {"user_id": int(uid), "username": users.get(int(uid), f"User {uid}"), "score": int(score)}
        for uid, score in scores_raw.items()
    ]
    leaderboard.sort(key=lambda x: x["score"], reverse=True)

    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1

    return leaderboard


async def get_question_answers(room_id: str, question_index: int) -> dict:
    """Return all submitted answers for a question (user_id → answer data)."""
    redis_client = get_redis()
    raw = await redis_client.hgetall(f"answers:{room_id}:{question_index}")
    return {uid: json.loads(data) for uid, data in raw.items()}


async def advance_question(room_id: str) -> int:
    """Increment question index, return new index."""
    redis_client = get_redis()
    new_index = await redis_client.hincrby(f"game:{room_id}", "current_question_index", 1)
    return int(new_index)


async def end_game(room_id: str):
    """Mark game as finished in Redis."""
    redis_client = get_redis()
    await redis_client.hset(f"game:{room_id}", "status", "finished")
    await redis_client.hset(f"room:{room_id}", "status", "finished")


async def save_results_to_db(room_id: str, db: AsyncSession):
    """Persist final scores to game_results table."""
    leaderboard = await get_leaderboard(room_id, db)

    # Mark room as finished in DB
    await update_game_room_status(room_id, db, "finished")

    for entry in leaderboard:
        game_result = GameResult(
            room_code=room_id,
            user_id=entry["user_id"],
            final_score=entry["score"],
            rank=entry["rank"],
        )
        db.add(game_result)

    await db.commit()


async def get_final_results(room_id: str, db: AsyncSession) -> list[dict]:
    """Get final results — from Redis if game is recent, else from DB."""
    redis_client = get_redis()
    game_data = await redis_client.hgetall(f"game:{room_id}")

    if game_data:
        return await get_leaderboard(room_id, db)

    # Fall back to DB
    result = await db.execute(
        select(GameResult, User)
        .join(User, GameResult.user_id == User.id)
        .where(GameResult.room_code == room_id)
        .order_by(GameResult.rank)
    )
    rows = result.all()
    return [
        {"rank": gr.rank, "user_id": gr.user_id, "username": u.username, "score": gr.final_score}
        for gr, u in rows
    ]


async def update_game_room_status(room_id: str, db: AsyncSession, status: str, finished_at: datetime | None = None):
    """Update the persistent game room status."""
    result = await db.execute(select(GameRoom).where(GameRoom.room_code == room_id))
    room = result.scalar_one_or_none()
    if not room:
        return

    room.status = status
    if status == "finished":
        room.finished_at = finished_at or datetime.utcnow()

    db.add(room)
    await db.commit()
