import asyncio
import json
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.security import decode_access_token
from ..services.user_service import get_user_by_id, get_users_by_ids
from ..services.matchmaking import get_room_players, remove_player_from_room, MIN_PLAYERS_FOR_START
from ..services.question_service import get_questions_for_room
from ..services.game_service import (
    start_game,
    submit_answer,
    get_leaderboard,
    get_question_answers,
    advance_question,
    end_game,
    save_results_to_db,
    QUESTION_TIME_LIMIT,
)
from ..websocket.manager import manager
from ..core.redis import get_redis

router = APIRouter()

# Track rooms that already have a countdown or game loop running
_countdown_running: set[str] = set()
_game_running: set[str] = set()


async def _run_countdown(room_id: str, seconds: int = 10):
    """Broadcast countdown ticks then trigger game start."""
    try:
        for remaining in range(seconds, 0, -1):
            await manager.broadcast(room_id, {"event": "countdown", "seconds_left": remaining})
            await asyncio.sleep(1)
        await manager.broadcast(room_id, {"event": "game_start", "room_id": room_id})
    finally:
        _countdown_running.discard(room_id)


async def _run_game_loop(room_id: str, category: str, db: AsyncSession):
    """
    Server-side question cycle for a game room.
    Runs fully on the server; clients receive events via WebSocket.
    """
    if room_id in _game_running:
        return
    _game_running.add(room_id)

    try:
        questions = await get_questions_for_room(room_id, category, db)
        if not questions:
            await manager.broadcast(room_id, {"event": "error", "message": "No questions found for this category"})
            return

        await start_game(room_id)
        total_questions = len(questions)

        for q_index, question in enumerate(questions):
            question_start = time.time()

            # Send question WITHOUT correct answer
            await manager.broadcast(room_id, {
                "event": "question",
                "question_index": q_index,
                "total_questions": total_questions,
                "question_text": question["question_text"],
                "option_a": question["option_a"],
                "option_b": question["option_b"],
                "option_c": question["option_c"],
                "option_d": question["option_d"],
                "difficulty": question["difficulty"],
                "time_limit": QUESTION_TIME_LIMIT,
            })

            # Wait for time limit, polling every second
            for _ in range(QUESTION_TIME_LIMIT):
                await asyncio.sleep(1)
                # Check if all players have answered
                player_ids = await get_room_players(room_id)
                if player_ids:
                    answers = await get_question_answers(room_id, q_index)
                    if len(answers) >= len(player_ids):
                        break  # All answered early

            # Reveal correct answer and per-player score breakdown
            answers = await get_question_answers(room_id, q_index)
            answer_breakdown = {
                uid: {"answer": data["answer"], "correct": data["correct"], "score": data["score"]}
                for uid, data in answers.items()
            }
            await manager.broadcast(room_id, {
                "event": "answer_result",
                "question_index": q_index,
                "correct_answer": question["correct_answer"],
                "answers": answer_breakdown,
            })

            # Send updated leaderboard
            leaderboard = await get_leaderboard(room_id, db)
            await manager.broadcast(room_id, {
                "event": "leaderboard",
                "leaderboard": leaderboard,
            })

            # Pause before next question (skip pause after last question)
            if q_index < total_questions - 1:
                await asyncio.sleep(3)

        # Game over
        await end_game(room_id)
        final_leaderboard = await get_leaderboard(room_id, db)
        await save_results_to_db(room_id, db)

        await manager.broadcast(room_id, {
            "event": "game_over",
            "leaderboard": final_leaderboard,
        })

    except Exception as e:
        await manager.broadcast(room_id, {"event": "error", "message": "Game loop error"})
        raise
    finally:
        _game_running.discard(room_id)


async def _resolve_players(db: AsyncSession, room_id: str) -> list[dict]:
    """Return player list as [{id, username}] for a room."""
    player_ids = await get_room_players(room_id)
    users = await get_users_by_ids(db, player_ids)
    id_to_username = {u.id: u.username for u in users}
    return [{"id": pid, "username": id_to_username.get(pid, f"User {pid}")} for pid in player_ids]


@router.websocket("/ws/room/{room_id}")
async def websocket_room(
    room_id: str,
    websocket: WebSocket,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    # Authenticate
    payload = decode_access_token(token)
    if payload is None or payload.get("sub") is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user = await get_user_by_id(db, int(payload["sub"]))
    if user is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(room_id, websocket)

    # Send current player list only to the newly connected client
    players = await _resolve_players(db, room_id)
    await manager.send_personal_message({"event": "players", "players": players}, websocket)

    # Broadcast to everyone that this player joined
    await manager.broadcast(room_id, {"event": "player_joined", "user_id": user.id, "username": user.username})

    # Start countdown if minimum players reached and no countdown is running yet
    if len(players) >= MIN_PLAYERS_FOR_START and room_id not in _countdown_running:
        _countdown_running.add(room_id)
        asyncio.create_task(_run_countdown(room_id))

    try:
        while True:
            data = await websocket.receive_json()
            evt = data.get("event")

            if evt == "ready":
                await manager.broadcast(room_id, {"event": "player_ready", "user_id": user.id})

            elif evt == "game_started":
                # Frontend confirms the game started; begin game loop if not already running
                redis_client = get_redis()
                room_data = await redis_client.hgetall(f"room:{room_id}")
                category = room_data.get("category", "general")
                if room_id not in _game_running:
                    asyncio.create_task(_run_game_loop(room_id, category, db))

            elif evt == "submit_answer":
                question_index = data.get("question_index")
                answer = data.get("answer", "").strip().upper()
                client_elapsed = data.get("elapsed_seconds", QUESTION_TIME_LIMIT)

                if question_index is None or answer not in ("A", "B", "C", "D"):
                    await manager.send_personal_message(
                        {"event": "error", "message": "Invalid answer submission"}, websocket
                    )
                    continue

                result = await submit_answer(room_id, user.id, question_index, answer, client_elapsed)
                await manager.send_personal_message(
                    {
                        "event": "answer_accepted",
                        "question_index": question_index,
                        "score_awarded": result.get("score_awarded", 0),
                        "already_answered": result.get("already_answered", False),
                    },
                    websocket,
                )

    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)
        await remove_player_from_room(room_id, user.id)
        await manager.broadcast(room_id, {"event": "player_left", "user_id": user.id})
        updated_players = await _resolve_players(db, room_id)
        await manager.broadcast(room_id, {"event": "players", "players": updated_players})
