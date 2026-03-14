"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface ChatMessage {
  user_id: number;
  username: string;
  text: string;
  timestamp: string;
}

type GameEvent =
  | { kind: "question"; index: number; total: number; text: string; options: string[] }
  | { kind: "answer_result"; correct: string }
  | { kind: "leaderboard"; leaders: { username: string; score: number }[] }
  | { kind: "game_over" };

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

const CONNECTION_LABEL: Record<ConnectionStatus, string> = {
  connecting: "Connecting…",
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Connection error",
};

export default function RoomChatPage() {
  const { roomCode } = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState("");
  const [socketError, setSocketError] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

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

    const addSystemMessage = (text: string) => {
      setMessages((current) => [
        ...current,
        {
          user_id: 0,
          username: "Game",
          text,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const sendMessage = (payload: { event: string; [key: string]: any }) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
      } else {
        setSocketError("Unable to send message while disconnected.");
      }
    };

    const handleMessage = (event: MessageEvent) => {
      const payload = JSON.parse(event.data);
      if (payload.event === "chat_history" && Array.isArray(payload.messages)) {
        setMessages(payload.messages as ChatMessage[]);
      }
      if (payload.event === "chat_message" && payload.message) {
        setMessages((current) => [...current, payload.message]);
      }
      if (payload.event === "question") {
        const opts = [payload.option_a, payload.option_b, payload.option_c, payload.option_d].filter(Boolean);
        const text = `Question ${Number(payload.question_index) + 1}/${payload.total_questions ?? "?"}: ${
          payload.question_text ?? ""
        }\nA) ${opts[0] ?? ""}\nB) ${opts[1] ?? ""}\nC) ${opts[2] ?? ""}\nD) ${opts[3] ?? ""}`;
        addSystemMessage(text);
      }
      if (payload.event === "answer_result" && payload.correct_answer) {
        addSystemMessage(`Correct answer: ${payload.correct_answer}`);
      }
      if (payload.event === "leaderboard" && Array.isArray(payload.leaderboard)) {
        const leaders = payload.leaderboard as { username: string; score: number }[];
        const board = leaders
          .slice(0, 5)
          .map((l, idx) => `${idx + 1}. ${l.username ?? "Player"} — ${l.score ?? 0}`)
          .join(" | ");
        addSystemMessage(`Leaderboard: ${board}`);
      }
      if (payload.event === "game_over") {
        addSystemMessage("Game over — thanks for playing!");
      }
    };

    const handleOpen = () => {
      setConnectionStatus("connected");
      setSocketError("");
    };
    const handleClose = () => {
      setConnectionStatus("disconnected");
    };
    const handleError = () => {
      setSocketError("WebSocket error");
      setConnectionStatus("error");
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("close", handleClose);
    socket.addEventListener("error", handleError);
    socketRef.current = socket;

    return () => {
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
    if (messages.length > 0 && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleChatSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed) return;
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    setSending(true);
    socket.send(JSON.stringify({ event: "send_message", text: trimmed }));
    setNewMessage("");
    setSending(false);
  };

  if (!roomCode) {
    return (
      <main className="min-h-screen flex items-center justify-center text-sm text-white/70">
        Room code required.
      </main>
    );
  }

  const formatTimestamp = (value: string) => {
    try {
      return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const canSendMessage = connectionStatus === "connected" && newMessage.trim().length > 0;

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
        <section className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-6">
          <div>
            <p className="text-sm text-white/50 uppercase tracking-[0.3em]">Room Chat</p>
            <h1 className="text-3xl font-semibold">Room {roomCode}</h1>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              {CONNECTION_LABEL[connectionStatus]}
            </p>
            {socketError && <p className="text-[0.65rem] text-red-400">{socketError}</p>}
          </div>
        </section>

        <section className="flex-1 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: "60vh" }}>
            {messages.length === 0 ? (
              <p className="text-sm text-white/40">No messages yet.</p>
            ) : (
              messages.map((message, idx) => (
                <div
                  key={`${message.user_id}-${idx}-${message.timestamp}`}
                  className={`rounded-2xl p-4 ${
                    message.user_id === user?.id ? "bg-[#3ddc84]/20 self-end" : "bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.3em] text-white/60">
                    <span>{message.username}</span>
                    <span>{formatTimestamp(message.timestamp)}</span>
                  </div>
                  <p className="mt-3 text-sm text-white">{message.text}</p>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          <form className="mt-4 flex gap-3" onSubmit={handleChatSubmit}>
            <input
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              placeholder="Drop a message..."
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#e8c84a]"
              disabled={connectionStatus !== "connected"}
            />
            <button
              type="submit"
              disabled={!canSendMessage || sending}
              className={`rounded-2xl px-5 py-3 text-sm font-semibold tracking-[0.2em] uppercase transition ${
                canSendMessage
                  ? "bg-[#e8c84a] text-black"
                  : "bg-white/5 text-white/40 cursor-not-allowed"
              }`}
            >
              Send
            </button>
          </form>
        </section>

        <div className="flex gap-3">
          <Link
            href={`/room/${roomCode}`}
            className="w-full rounded-xl border border-white/10 px-4 py-3 text-center text-sm uppercase tracking-[0.3em] text-white/60 hover:border-white/40"
          >
            Back to Lobby
          </Link>
          <Link
            href="/dashboard"
            className="w-full rounded-xl bg-[#e8c84a] px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.3em] text-black"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
