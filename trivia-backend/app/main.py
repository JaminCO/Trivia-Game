from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .api.auth import router as auth_router
from .api.matchmaking import router as matchmaking_router
from .api.ws import router as ws_router
from .api.game import router as game_router
from .core.redis import init_redis, close_redis


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_redis()
    yield
    # Shutdown
    await close_redis()


app = FastAPI(title="Trivia Backend", version="0.1.0", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001" "http://127.0.0.1:3000",], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth_router)
app.include_router(matchmaking_router)
app.include_router(ws_router)
app.include_router(game_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
