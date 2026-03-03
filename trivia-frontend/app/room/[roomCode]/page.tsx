"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface WSMessage {
  event: string;
  [key: string]: any;
}

export default function RoomPage({ params }: { params: { roomCode: string } }) {
  const { roomCode } = params;
  const router = useRouter();
  const { user, loading } = useAuth();
  const [players, setPlayers] = useState<number[]>([]);
  const [status, setStatus] = useState<string>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const [readySet, setReadySet] = useState<Set<number>>(new Set());

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
          setPlayers(msg.players);
          break;
        case "player_joined":
          setPlayers((prev) => Array.from(new Set([...prev, msg.user_id])));
          break;
        case "player_left":
          setPlayers((prev) => prev.filter((id) => id !== msg.user_id));
          break;
        case "player_ready":
          setReadySet((prev) => new Set(prev).add(msg.user_id));
          break;
      }
    };
    ws.onclose = () => setStatus("disconnected");

    return () => {
      ws.close();
    };
  }, [loading, user]);

  const handleReady = () => {
    wsRef.current?.send(JSON.stringify({ event: "ready" }));
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6">
      <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm text-muted-foreground">Room Lobby</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Room {roomCode}</h1>
        <p className="mt-3 text-sm text-muted-foreground">Status: {status}</p>

        <div className="mt-6">
          <h2 className="font-semibold">Players</h2>
          <ul className="mt-2 space-y-1">
            {players.map((id) => (
              <li key={id} className="flex items-center justify-between">
                <span>User {id}</span>
                {readySet.has(id) && <span className="text-green-600">Ready</span>}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={handleReady}
          className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          I'm Ready!
        </button>
      </section>
    </main>
  );
}
