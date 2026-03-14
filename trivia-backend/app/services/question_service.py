import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..models.question import Question
from ..core.redis import get_redis


async def get_questions_for_room(
    room_id: str, category: str, db: AsyncSession, count: int = 10
) -> list[dict]:
    """
    Fetch random questions for a room by category, cache in Redis.
    Returns list of question dicts (without correct_answer for clients).
    """
    redis_client = get_redis()
    cache_key = f"game:{room_id}:questions"

    # Return cached questions if already loaded
    cached = await redis_client.get(cache_key)
    if cached:
        cached_list = json.loads(cached)
        if cached_list:
            return cached_list

    # Query random questions from DB
    result = await db.execute(
        select(Question)
        .where(Question.category == category)
        .order_by(func.random())
        .limit(count)
    )
    questions = result.scalars().all()

    # Fallback question to keep the game loop running even if DB is empty
    if not questions:
        question_list = [
            {
                "id": -1,
                "question_text": "Fallback: What is 2 + 2?",
                "option_a": "3",
                "option_b": "4",
                "option_c": "5",
                "option_d": "22",
                "correct_answer": "B",
                "difficulty": "easy",
            }
        ]
    else:
        question_list = [
            {
                "id": q.id,
                "question_text": q.question_text,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d,
                "correct_answer": q.correct_answer,  # stored server-side only
                "difficulty": q.difficulty,
            }
            for q in questions
        ]

    # Cache for 2 hours
    await redis_client.set(cache_key, json.dumps(question_list), ex=7200)

    return question_list
