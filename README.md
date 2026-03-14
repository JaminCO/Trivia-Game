# 🧭 Project Objective

Deliver a **production-ready multiplayer trivia web app** (mobile-ready for Ionic later) with:

* Auto matchmaking (4–10 players)
* Real-time gameplay (30s questions)
* Points scoring
* Monetization ready
* Admin dashboard

Target: **working MVP in ~3 weeks**

---

**Current Phase (as of Mar 14, 2026): Phase 3 — WebSocket lobby & countdown (in progress).**  
Phase 0–1 are complete (auth + DB). Phase 2 Redis matchmaking core is implemented. Phase 3 live lobby/WS and Phase 4 question loop are partially running; chat UI exists and redirects after countdown, pending polish.

---

# 🏁 PHASE 0 — Project Setup (Day 0–1)

## 🎯 Goal

Create a clean, scalable foundation.

## ✅ Tasks

### Task 0.1 — Create repos

Create two folders:

```
trivia-backend/
trivia-frontend/
```

---

### Task 0.2 — Backend scaffold (FastAPI)

Inside backend:

```
app/
  main.py
  core/
  api/
  services/
  websocket/
  models/
  schemas/
```

Install:

```bash
pip install fastapi uvicorn redis sqlalchemy asyncpg python-jose passlib[bcrypt]
```

---

### Task 0.3 — Infrastructure services

You need running locally:

* PostgreSQL
* Redis

**Do this now with Docker Compose** (don’t postpone).

---

### Task 0.4 — Frontend scaffold

Use your preferred stack:

* Next.js (App Router)
* Tailwind
* shadcn/ui

Create pages:

```
/login
/dashboard
/room/[roomCode]
/game/[roomCode]
/results/[roomCode]
/admin
```

Mobile-first from day one.

---

# 🧱 PHASE 1 — Auth + Database (Day 2–3)

## 🎯 Goal

Users can register/login and be uniquely identified.

---

## ✅ Tasks

### Task 1.1 — PostgreSQL models

Create tables:

* users
* questions
* game_rooms (persistent history)
* game_results

Do NOT store live room state in Postgres.

---

### Task 1.2 — Auth endpoints

Implement:

```
POST /auth/register
POST /auth/login
GET  /auth/me
```

Use JWT.

---

### Task 1.3 — Frontend auth flow

Build:

* login page
* register page
* token storage
* protected routes

✅ **Checkpoint:** User can log in and reach dashboard.

---

# ⚡ PHASE 2 — Redis Room Engine (CRITICAL) (Day 4–6)

This is the heart of the system.

---

## 🎯 Goal

Auto matchmaking works perfectly.

---

## ✅ Tasks

### Task 2.1 — Redis connection service

Create:

```
app/core/redis.py
```

Expose async Redis client.

---

### Task 2.2 — Room schema in Redis

Implement structure:

```
room:{room_id}
room_players:{room_id}
category_rooms:{category}
```

---

### Task 2.3 — Matchmaking service

Create:

```
services/matchmaking.py
```

Function:

```python
async def find_or_create_room(user_id, category)
```

Logic:

1. Search waiting rooms in category
2. Filter players < 10
3. Join if found
4. Else create room
5. Start fill timer

This must be rock solid.

---

### Task 2.4 — HTTP endpoint

Create:

```
POST /matchmaking/join
```

Returns:

```json
{
  "room_id": "...",
  "status": "waiting"
}
```

---

### Task 2.5 — Frontend integration

Dashboard:

* user selects category
* call matchmaking endpoint
* redirect to room lobby

✅ **Checkpoint:** Users auto-group into rooms.

---

# 🔌 PHASE 3 — WebSocket Infrastructure (Day 7–9)

Now we go real-time.

---

## 🎯 Goal

Lobby sync works live.

---

## ✅ Tasks

### Task 3.1 — WebSocket manager

Create:

```
websocket/manager.py
```

Responsibilities:

* track connections per room
* broadcast to room
* handle disconnects

---

### Task 3.2 — WebSocket endpoint

Create:

```
/ws/{room_id}
```

On connect:

* verify JWT
* join room channel
* send current lobby state

---

### Task 3.3 — Lobby events

Implement events:

* PLAYER_JOINED
* PLAYER_LEFT
* ROOM_COUNTDOWN

---

### Task 3.4 — Frontend socket client

Room lobby must show live:

* player count
* avatars/usernames
* countdown

✅ **Checkpoint:** Multiple browsers sync in real time.

---

# 🎮 PHASE 4 — Game Engine (Day 10–14)

This is the most sensitive part.

---

## 🎯 Goal

Full trivia round works.

---

## ✅ Tasks

### Task 4.1 — Question loader

Backend service:

* fetch random questions by category
* cache in Redis per room

---

### Task 4.2 — Game state in Redis

Create keys:

```
game:{room_id}
answers:{room_id}:{question_index}
scores:{room_id}
```

---

### Task 4.3 — Question cycle engine

Server flow:

1. Broadcast question
2. Start 30s timer
3. Accept answers
4. Lock answers
5. Calculate scores
6. Broadcast leaderboard
7. Next question

Timers must be server-side.

---

### Task 4.4 — Submit answer event

WebSocket event:

```
SUBMIT_ANSWER
```

Server must:

* validate player
* check not already answered
* store timestamp
* prevent late answers

---

### Task 4.5 — Frontend game UI

Game screen:

* timer bar
* question text
* answer buttons
* live leaderboard

✅ **Checkpoint:** Full game playable.

---

# 🛠 PHASE 5 — Admin Dashboard (Day 15–17)

Client value booster.

---

## 🎯 Goal

Client can manage questions.

---

## ✅ Tasks

### Task 5.1 — Admin role system

Add:

```
is_admin
```

to users.

Protect `/admin`.

---

### Task 5.2 — Question CRUD

Admin can:

* create question
* edit
* delete
* bulk upload CSV (optional but impressive)

---

### Task 5.3 — Basic analytics

Show:

* total users
* games played
* active rooms

✅ **Checkpoint:** Admin fully functional.

---

# 💰 PHASE 6 — Monetization Hook (Day 18–19)

Keep MVP simple.

---

## Recommended first monetization

Start with:

* interstitial ads placeholder
* premium flag in user table

You can integrate real ads later.

---

# 📱 PHASE 7 — Mobile Preparation (Day 20)

Before Ionic, ensure:

✅ responsive UI
✅ no browser-only APIs
✅ socket reconnect works
✅ touch friendly

---

# 🚀 PHASE 8 — Deployment (Day 21)

## Backend

Deploy to:

* Railway / Render / VPS

## Redis

Use managed Redis.

## Frontend

Deploy to Vercel.
