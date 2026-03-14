"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { matchmakingAPI } from "@/lib/api";

interface PlayerEntry {
  id: number;
  username: string;
}

const SOCKET_EVENTS = {
  COUNTDOWN: "countdown",
  GAME_START: "game_start",
  PLAYERS: "players",
  PLAYER_JOINED: "player_joined",
  PLAYER_LEFT: "player_left",
} as const;

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

const CONNECTION_LABEL: Record<ConnectionStatus, string> = {
  connecting: "Connecting…",
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Connection error",
};

const normalizePlayerList = (items: unknown[]): PlayerEntry[] =>
  items.reduce<PlayerEntry[]>((acc, item) => {
    if (typeof item === "number") {
      acc.push({ id: item, username: `Player ${item}` });
    } else if (typeof item === "object" && item !== null) {
      const entry = item as { id?: number; username?: string };
      if (typeof entry.id === "number") {
        acc.push({
          id: entry.id,
          username: entry.username ?? `Player ${entry.id}`,
        });
      }
    }
    return acc;
  }, []);

export default function RoomPage() {
  const { roomCode: roomCodeParam } = useParams<{ roomCode: string | string[] }>();
  const roomCode = Array.isArray(roomCodeParam) ? roomCodeParam[0] : roomCodeParam;
  const router = useRouter();
  const { user, loading } = useAuth();
  const [players, setPlayers] = useState<PlayerEntry[]>([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [socketError, setSocketError] = useState("");
  const [countdownActive, setCountdownActive] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [gameInProgress, setGameInProgress] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    let isActive = true;
    const fetchPlayers = async () => {
      setRefreshing(true);
      try {
        const roomPlayers = await matchmakingAPI.getPlayers(roomCode);
        if (!isActive) return;
        setPlayers(normalizePlayerList(roomPlayers));
      } catch (err: any) {
        if (!isActive) return;
        setError(err?.response?.data?.detail ?? "Unable to load players");
      } finally {
        if (isActive) {
          setRefreshing(false);
        }
      }
    };

    fetchPlayers();
    return () => {
      isActive = false;
    };
  }, [roomCode]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!roomCode || !user) {
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setSocketError("Missing session token, please log in again.");
      setConnectionStatus("error");
      return;
    }

    const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
    const host = apiUrl.replace(/^https?:\/\//, "");
    const protocol = apiUrl.startsWith("https") ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${host}/ws/room/${roomCode}?token=${encodeURIComponent(token)}`);
    let isActive = true;

    setConnectionStatus("connecting");
    setSocketError("");

    const sendGameStarted = () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ event: "game_started" }));
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (!isActive) return;
      try {
        const payload = JSON.parse(event.data);
        switch (payload.event) {
          case SOCKET_EVENTS.PLAYERS:
            setPlayers(
              Array.isArray(payload.players)
                ? normalizePlayerList(payload.players)
                : []
            );
            setError("");
            break;
          case SOCKET_EVENTS.PLAYER_JOINED: {
            const joinedId = Number(payload.user_id);
            if (!Number.isNaN(joinedId)) {
              setPlayers((current) => {
                if (current.some((p) => p.id === joinedId)) {
                  return current;
                }
                return [
                  ...current,
                  {
                    id: joinedId,
                    username: payload.username ?? `Player ${joinedId}`,
                  },
                ];
              });
            }
            break;
          }
          case SOCKET_EVENTS.PLAYER_LEFT: {
            const leftId = Number(payload.user_id);
            if (!Number.isNaN(leftId)) {
              setPlayers((current) => current.filter((p) => p.id !== leftId));
            }
            break;
          }
          case SOCKET_EVENTS.COUNTDOWN:
            setSocketError("");
            setCountdownActive(true);
            setSecondsRemaining(payload.seconds_left ?? null);
            setGameInProgress(false);
            break;
          case SOCKET_EVENTS.GAME_START:
            setCountdownActive(false);
            setSecondsRemaining(null);
            setGameInProgress(true);
            sendGameStarted();
            break;
          default:
            break;
        }
      } catch (err) {
        console.error("WS payload parse error", err);
      }
    };

    const handleOpen = () => {
      if (!isActive) return;
      setConnectionStatus("connected");
      setSocketError("");
    };
    const handleClose = () => {
      if (!isActive) return;
      setConnectionStatus((prev) => (prev === "error" ? prev : "disconnected"));
    };
    const handleError = () => {
      if (!isActive) return;
      setSocketError("WebSocket connection failure");
      setConnectionStatus("error");
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("close", handleClose);
    socket.addEventListener("error", handleError);
    socketRef.current = socket;

    return () => {
      isActive = false;
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("close", handleClose);
      socket.removeEventListener("error", handleError);
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
      socketRef.current = null;
    };
  }, [roomCode, user]);

  useEffect(() => {
    if (gameInProgress && roomCode) {
      router.push(`/room/${roomCode}/chat`);
    }
  }, [gameInProgress, roomCode, router]);

  if (!roomCode) {
    return (
      <main className="min-h-screen flex items-center justify-center text-sm text-white/70">
        Room code not found.
      </main>
    );
  }

  const countdownLabel = gameInProgress
    ? "Game in progress"
    : countdownActive
    ? `Game starts in ${secondsRemaining ?? "…"}s`
    : "Waiting for players";

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-3xl mx-auto py-12 px-6 space-y-8">
        <section className="p-6 border border-white/10 rounded-xl space-y-3 bg-white/5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Room {roomCode}</h1>
              <p className="text-sm text-white/50">{countdownLabel}</p>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                {CONNECTION_LABEL[connectionStatus]}
              </span>
              {socketError && (
                <p className="text-[0.65rem] text-red-400 mt-1">{socketError}</p>
              )}
            </div>
          </div>
          <p className="text-sm text-white/50">
            Once the lobby reaches the minimum players, the countdown will begin and the game
            loop will start automatically.
          </p>
          <div className="text-xs text-white/40 flex gap-4">
            <div className="space-y-1">
              <p className="uppercase tracking-[0.3em] text-[0.6rem]">Players</p>
              <p className="text-2xl font-semibold">{players.length}</p>
            </div>
            <div className="space-y-1">
              <p className="uppercase tracking-[0.3em] text-[0.6rem]">Auto-refresh</p>
              <p className="text-sm">{refreshing ? "Refreshing…" : "Idle"}</p>
            </div>
          </div>
          {(countdownActive || gameInProgress) && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-gradient-to-r from-[#e8c84a]/20 via-transparent to-[#3ddc84]/15 p-4 text-center">
              <p className="text-[0.65rem] uppercase tracking-[0.4em] text-white/60 mb-1">
                {gameInProgress ? "Game in Progress" : "Countdown"}
              </p>
              <p className="text-5xl font-bebas text-white leading-none">
                {gameInProgress
                  ? "LIVE"
                  : countdownActive
                  ? secondsRemaining ?? "…"
                  : "…"}
              </p>
              <p className="text-sm text-white/70">
                {gameInProgress
                  ? "The round is underway."
                  : "Once the countdown hits zero the game will begin."}
              </p>
            </div>
          )}
        </section>

        <section className="p-6 border border-white/10 rounded-xl bg-white/5">
          <h2 className="text-lg font-semibold mb-4">Players in this room</h2>
          {error && <p className="text-sm text-red-400 mb-2">{error}</p>}
          <div className="space-y-3">
            {players.length === 0 ? (
              <p className="text-sm text-white/40">No players yet.</p>
            ) : (
              players.map((player) => (
                <div
                  key={`player-${player.id}-${player.username}`}
                  className="flex items-center justify-between rounded-lg border border-white/5 px-4 py-3 bg-white/5"
                >
                  <span className="font-mono2 text-sm uppercase tracking-wide text-white/50">
                    #{player.id}
                  </span>
                  <span className="text-white">{player.username}</span>
                  <span className="text-xs text-white/40">Ready</span>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full rounded-xl bg-[#e8c84a] text-black py-3 text-center font-semibold"
          >
            Back to Dashboard
          </button>
          <Link
            href="/"
            className="text-center text-sm text-white/60 underline underline-offset-4"
          >
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
