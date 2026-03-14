"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface Player {
  id: number;
  username: string;
}

interface WSMessage {
  event: string;
  [key: string]: any;
}

const MAX_PLAYERS = 10;
const COUNTDOWN_START = 10;

export default function RoomPage({ params }: { params: { roomCode: string } }) {
  const { roomCode } = params;
  const router = useRouter();
  const { user, loading } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [status, setStatus] = useState<string>("connecting");
  const [readySet, setReadySet] = useState<Set<number>>(new Set());
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const wsUrl = baseUrl.replace(/^http/, "ws") + `/ws/room/${roomCode}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setStatus("connected");

    ws.onmessage = (e) => {
      const msg: WSMessage = JSON.parse(e.data);
      switch (msg.event) {
        case "players":
          setPlayers(msg.players as Player[]);
          break;
        case "player_joined":
          setPlayers((prev) => {
            if (prev.some((p) => p.id === msg.user_id)) return prev;
            return [...prev, { id: msg.user_id, username: msg.username }];
          });
          break;
        case "player_left":
          setPlayers((prev) => prev.filter((p) => p.id !== msg.user_id));
          break;
        case "player_ready":
          setReadySet((prev) => new Set(prev).add(msg.user_id));
          break;
        case "countdown":
          setCountdown(msg.seconds_left as number);
          break;
        case "game_start":
          router.push(`/game/${roomCode}`);
          break;
      }
    };

    ws.onclose = () => setStatus("disconnected");

    return () => {
      ws.close();
    };
  }, [loading, user, roomCode]);

  const handleReady = () => {
    wsRef.current?.send(JSON.stringify({ event: "ready" }));
    setIsReady(true);
  };

  const countdownPct = countdown !== null ? (countdown / COUNTDOWN_START) * 100 : 0;

  return (
    <>
      <style>{`
        @keyframes pulse-ring { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:.8;transform:scale(1.05)} }
      `}</style>

      <main className="relative min-h-screen bg-[#080808] text-[#f5f0e8] font-syne flex items-center justify-center px-4 py-8">

        {/* Ambient blob */}
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(232,200,74,0.05) 0%, transparent 70%)", filter: "blur(100px)" }} />

        <div className="relative z-10 w-full max-w-2xl space-y-4">

          {/* Header */}
          <div className="border border-white/10 p-6 sm:p-8">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e8c84a] to-transparent" />
            <p className="font-mono2 text-[0.62rem] tracking-[0.2em] uppercase text-white/30 mb-1">Room Lobby</p>
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <h1 className="font-bebas text-[2.5rem] tracking-widest text-[#e8c84a]">{roomCode}</h1>
              <span className={`font-mono2 text-[0.62rem] tracking-widest uppercase flex items-center gap-1.5 ${
                status === "connected" ? "text-[#3ddc84]" : "text-white/30"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status === "connected" ? "bg-[#3ddc84] animate-pulse" : "bg-white/20"}`} />
                {status}
              </span>
            </div>
          </div>

          {/* Countdown banner */}
          {countdown !== null && (
            <div className="border border-[#e8c84a]/40 bg-[#e8c84a]/[0.04] p-6 text-center">
              <p className="font-mono2 text-[0.62rem] tracking-[0.2em] uppercase text-[#e8c84a] mb-3">
                Game starting in
              </p>
              <div className="font-bebas text-[5rem] leading-none text-[#e8c84a] mb-4">{countdown}</div>
              <div className="h-1.5 bg-white/8 rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#e8c84a] to-[#f06a2b] rounded transition-all duration-1000"
                  style={{ width: `${countdownPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Player list */}
          <div className="border border-white/8 p-6 sm:p-8">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="font-bebas text-[1.4rem] tracking-wide">Players</h2>
              <span className="font-mono2 text-[0.62rem] tracking-widest text-white/30">
                {players.length} / {MAX_PLAYERS}
              </span>
            </div>

            {players.length === 0 ? (
              <p className="font-mono2 text-[0.68rem] tracking-widest text-white/20 text-center py-6">
                Waiting for players...
              </p>
            ) : (
              <ul className="space-y-0.5">
                {players.map((p) => {
                  const isCurrentUser = p.id === user?.id;
                  const isPlayerReady = readySet.has(p.id);
                  return (
                    <li
                      key={p.id}
                      className={`flex items-center justify-between px-4 py-3 border ${
                        isCurrentUser ? "border-[#e8c84a]/20 bg-[#e8c84a]/[0.03]" : "border-white/8 bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bebas text-[1rem] ${
                          isCurrentUser ? "bg-[#e8c84a]/20 text-[#e8c84a]" : "bg-white/8 text-white/60"
                        }`}>
                          {p.username[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span className={`font-syne text-[0.9rem] ${isCurrentUser ? "text-[#e8c84a]" : "text-[#f5f0e8]"}`}>
                          {p.username}
                          {isCurrentUser && (
                            <span className="ml-2 font-mono2 text-[0.52rem] tracking-widest uppercase text-white/30">you</span>
                          )}
                        </span>
                      </div>
                      {isPlayerReady ? (
                        <span className="font-mono2 text-[0.58rem] tracking-widest uppercase text-[#3ddc84] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3ddc84]" />
                          Ready
                        </span>
                      ) : (
                        <span className="font-mono2 text-[0.58rem] tracking-widest uppercase text-white/20">Waiting</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Ready button */}
          <button
            onClick={handleReady}
            disabled={isReady || status !== "connected"}
            className={`w-full font-bebas text-[1.3rem] tracking-widest py-5 transition-all duration-200 ${
              isReady
                ? "bg-[#3ddc84]/20 text-[#3ddc84] cursor-default border border-[#3ddc84]/20"
                : status === "connected"
                ? "bg-[#e8c84a] text-[#080808] hover:bg-[#f06a2b]"
                : "bg-white/5 text-white/20 cursor-not-allowed"
            }`}
          >
            {isReady ? "✓ Ready!" : "I'm Ready"}
          </button>

          {players.length < 2 && countdown === null && (
            <p className="font-mono2 text-[0.62rem] tracking-widest text-white/25 text-center">
              Waiting for at least 1 more player to start the countdown...
            </p>
          )}

        </div>
      </main>
    </>
  );
}
