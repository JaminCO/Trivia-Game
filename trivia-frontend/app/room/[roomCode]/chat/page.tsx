"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface ChatMessage {
  user_id: number;
  username: string;
  text: string;
  timestamp: string;
}

type AnswerLetter = "A" | "B" | "C" | "D";

type CurrentQuestion = {
  index: number;
  total: number;
  text: string;
  options: Record<AnswerLetter, string>;
  timeLimitSeconds: number;
};

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

const CONNECTION_LABEL: Record<ConnectionStatus, string> = {
  connecting: "Connecting…",
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Connection error",
};

export default function RoomChatPage() {
  const { roomCode: roomCodeParam } = useParams<{ roomCode: string | string[] }>();
  const roomCode = Array.isArray(roomCodeParam) ? roomCodeParam[0] : roomCodeParam;
  const router = useRouter();
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState("");
  const [socketError, setSocketError] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [questionReceivedAtMs, setQuestionReceivedAtMs] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerLetter | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [answerAccepted, setAnswerAccepted] = useState<{ alreadyAnswered: boolean; scoreAwarded: number } | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<AnswerLetter | null>(null);
  const [leaderboard, setLeaderboard] = useState<Array<{ username: string; score: number }> | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!questionReceivedAtMs || !currentQuestion) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [questionReceivedAtMs, currentQuestion]);

  const secondsLeft = useMemo(() => {
    if (!currentQuestion || !questionReceivedAtMs) return null;
    const elapsed = (nowMs - questionReceivedAtMs) / 1000;
    return Math.max(0, currentQuestion.timeLimitSeconds - elapsed);
  }, [currentQuestion, questionReceivedAtMs, nowMs]);

  const canAnswer = useMemo(() => {
    if (connectionStatus !== "connected") return false;
    if (!currentQuestion) return false;
    if (!secondsLeft || secondsLeft <= 0) return false;
    if (submitted) return false;
    return true;
  }, [connectionStatus, currentQuestion, secondsLeft, submitted]);

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

    const handleMessage = (event: MessageEvent) => {
      const payload = JSON.parse(event.data);
      if (payload.event === "chat_history" && Array.isArray(payload.messages)) {
        setMessages(payload.messages as ChatMessage[]);
      }
      if (payload.event === "chat_message" && payload.message) {
        setMessages((current) => [...current, payload.message]);
      }
      if (payload.event === "error") {
        const msg = String(payload.message ?? "Server error");
        setSocketError(msg);
        addSystemMessage(`Error: ${msg}`);
      }
      if (payload.event === "question") {
        const opts: Record<AnswerLetter, string> = {
          A: String(payload.option_a ?? ""),
          B: String(payload.option_b ?? ""),
          C: String(payload.option_c ?? ""),
          D: String(payload.option_d ?? ""),
        };
        const idx = Number(payload.question_index ?? 0);
        const total = Number(payload.total_questions ?? 0) || 0;
        const timeLimitSeconds = Number(payload.time_limit ?? 30) || 30;

        setCurrentQuestion({
          index: idx,
          total,
          text: String(payload.question_text ?? ""),
          options: opts,
          timeLimitSeconds,
        });
        setQuestionReceivedAtMs(Date.now());
        setSelectedAnswer(null);
        setSubmitted(false);
        setAnswerAccepted(null);
        setCorrectAnswer(null);
        setLeaderboard(null);
        setGameOver(false);
        setSocketError("");

        const text = `Question ${idx + 1}/${total || "?"}: ${payload.question_text ?? ""}\nA) ${opts.A}\nB) ${opts.B}\nC) ${opts.C}\nD) ${opts.D}`;
        addSystemMessage(text);
      }
      if (payload.event === "answer_accepted") {
        const alreadyAnswered = Boolean(payload.already_answered);
        const scoreAwarded = Number(payload.score_awarded ?? 0) || 0;
        setAnswerAccepted({ alreadyAnswered, scoreAwarded });
        if (alreadyAnswered) {
          addSystemMessage("Answer already submitted.");
        } else {
          addSystemMessage(`Answer locked in (+${scoreAwarded} pts).`);
        }
      }
      if (payload.event === "answer_result" && payload.correct_answer) {
        setCorrectAnswer(String(payload.correct_answer).toUpperCase() as AnswerLetter);
        addSystemMessage(`Correct answer: ${payload.correct_answer}`);
      }
      if (payload.event === "leaderboard" && Array.isArray(payload.leaderboard)) {
        const leaders = payload.leaderboard as { username: string; score: number }[];
        setLeaderboard(leaders.map((l) => ({ username: l.username ?? "Player", score: l.score ?? 0 })));
        const board = leaders
          .slice(0, 5)
          .map((l, idx) => `${idx + 1}. ${l.username ?? "Player"} — ${l.score ?? 0}`)
          .join(" | ");
        addSystemMessage(`Leaderboard: ${board}`);
      }
      if (payload.event === "game_over") {
        setGameOver(true);
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

    const maybeLetter = trimmed.toUpperCase();
    if (
      currentQuestion &&
      questionReceivedAtMs &&
      canAnswer &&
      (maybeLetter === "A" || maybeLetter === "B" || maybeLetter === "C" || maybeLetter === "D")
    ) {
      const elapsedSeconds = Math.max(0, (Date.now() - questionReceivedAtMs) / 1000);
      const letter = maybeLetter as AnswerLetter;
      setSelectedAnswer(letter);
      setSubmitted(true);
      setSocketError("");
      socket.send(JSON.stringify({
        event: "submit_answer",
        question_index: currentQuestion.index,
        answer: letter,
        elapsed_seconds: Number(elapsedSeconds.toFixed(2)),
      }));
      setNewMessage("");
      return;
    }

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

  const submitAnswer = (letter: AnswerLetter) => {
    if (!currentQuestion || !questionReceivedAtMs) return;
    if (!canAnswer) return;
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const elapsedSeconds = Math.max(0, (Date.now() - questionReceivedAtMs) / 1000);
    setSelectedAnswer(letter);
    setSubmitted(true);
    setSocketError("");
    socket.send(JSON.stringify({
      event: "submit_answer",
      question_index: currentQuestion.index,
      answer: letter,
      elapsed_seconds: Number(elapsedSeconds.toFixed(2)),
    }));
  };

  const timerPct = useMemo(() => {
    if (!currentQuestion || secondsLeft === null) return 0;
    return Math.max(0, Math.min(100, (secondsLeft / currentQuestion.timeLimitSeconds) * 100));
  }, [currentQuestion, secondsLeft]);

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
            {error && <p className="text-[0.65rem] text-red-400">{error}</p>}
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/50">Pinned</p>
              <h2 className="mt-2 text-lg font-semibold">Game</h2>
              {currentQuestion ? (
                <p className="mt-1 text-sm text-white/70">
                  Question {currentQuestion.index + 1}/{currentQuestion.total || "?"}
                </p>
              ) : (
                <p className="mt-1 text-sm text-white/50">Waiting for the next question…</p>
              )}
            </div>
            <div className="w-[180px] shrink-0">
              <div className="flex items-baseline justify-between">
                <span className="text-[0.65rem] uppercase tracking-[0.3em] text-white/40">Time</span>
                <span className="text-sm font-semibold text-white/80">
                  {secondsLeft === null ? "—" : `${Math.ceil(secondsLeft)}s`}
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-black/40 overflow-hidden">
                <div className="h-full bg-[#e8c84a]" style={{ width: `${timerPct}%` }} />
              </div>
            </div>
          </div>

          {currentQuestion && (
            <>
              <p className="mt-4 text-sm text-white whitespace-pre-line">
                {currentQuestion.text}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {(["A", "B", "C", "D"] as const).map((letter) => {
                  const optionText = currentQuestion.options[letter];
                  const isSelected = selectedAnswer === letter;
                  const isCorrect = correctAnswer === letter;
                  const showResult = Boolean(correctAnswer);
                  const disabled = !canAnswer;

                  let cls = "border-white/10 bg-black/30 text-white/90 hover:border-white/30";
                  if (disabled) cls = "border-white/10 bg-black/20 text-white/40 cursor-not-allowed";
                  if (isSelected && !showResult) cls = "border-[#e8c84a]/50 bg-[#e8c84a]/10 text-white";
                  if (showResult && isCorrect) cls = "border-[#3ddc84]/50 bg-[#3ddc84]/10 text-white";
                  if (showResult && isSelected && !isCorrect) cls = "border-red-400/40 bg-red-400/10 text-white";

                  return (
                    <button
                      key={letter}
                      type="button"
                      disabled={disabled}
                      onClick={() => submitAnswer(letter)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${cls}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-white/60">
                          {letter}
                        </span>
                        <span className="text-sm text-white/90">{optionText}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 text-[0.7rem] text-white/50">
                {answerAccepted ? (
                  answerAccepted.alreadyAnswered ? "You already answered this one." : `Answer submitted (+${answerAccepted.scoreAwarded} pts).`
                ) : submitted ? (
                  "Submitting answer…"
                ) : (
                  "Type A/B/C/D + Enter, or tap an option to answer."
                )}
              </div>

              {leaderboard && leaderboard.length > 0 && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/50">Leaderboard</p>
                  <div className="mt-2 space-y-1">
                    {leaderboard.slice(0, 5).map((l, idx) => (
                      <div key={`${l.username}-${idx}`} className="flex items-center justify-between text-sm">
                        <span className="text-white/80">{idx + 1}. {l.username}</span>
                        <span className="font-semibold text-white/80">{l.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {gameOver && (
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-sm text-white/70">Game over.</p>
                  <button
                    type="button"
                    onClick={() => router.push(`/results/${roomCode}`)}
                    className="rounded-xl bg-[#e8c84a] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black"
                  >
                    View Results
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <section className="flex-1 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: "60vh" }}>
            {messages.length === 0 ? (
              <p className="text-sm text-white/40">No messages yet.</p>
            ) : (
              messages.map((message, idx) => {
                const mine = message.user_id === user?.id;
                const isGame = message.user_id === 0;
                const key = `${message.user_id}-${idx}-${message.timestamp}`;

                if (isGame) {
                  const text = message.text ?? "";
                  const tag =
                    text.startsWith("Question")
                      ? "QUESTION"
                      : text.startsWith("Correct answer")
                      ? "ANSWER"
                      : text.startsWith("Leaderboard")
                      ? "LEADERBOARD"
                      : text.startsWith("Game over")
                      ? "GAME OVER"
                      : text.startsWith("Error:")
                      ? "ERROR"
                      : text.startsWith("Answer locked") || text.startsWith("Answer already")
                      ? "ANSWER"
                      : "GAME";

                  const tone =
                    tag === "ERROR"
                      ? "border-red-400/25 bg-red-400/10"
                      : tag === "ANSWER"
                      ? "border-[#3ddc84]/25 bg-[#3ddc84]/10"
                      : tag === "QUESTION"
                      ? "border-[#e8c84a]/25 bg-[#e8c84a]/10"
                      : tag === "GAME OVER"
                      ? "border-[#f06a2b]/25 bg-[#f06a2b]/10"
                      : "border-white/10 bg-white/[0.03]";

                  return (
                    <div key={key} className="flex justify-center">
                      <div className={`w-full max-w-[640px] rounded-2xl border px-4 py-3 ${tone}`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono2 text-[0.55rem] tracking-[0.25em] uppercase text-white/70 border border-white/10 px-2 py-1 rounded-full">
                              Game
                            </span>
                            <span className="font-mono2 text-[0.55rem] tracking-[0.25em] uppercase text-white/40">
                              {tag}
                            </span>
                          </div>
                          <span className="font-mono2 text-[0.55rem] tracking-[0.25em] uppercase text-white/30">
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-line text-sm text-white/90">{text}</p>
                      </div>
                    </div>
                  );
                }

                const initial = (message.username?.trim()?.[0] ?? "?").toUpperCase();

                return (
                  <div key={key} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                    {!mine && (
                      <div className="mt-1 h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm font-semibold text-white/70">
                        {initial}
                      </div>
                    )}
                    <div
                      className={`max-w-[78%] rounded-2xl border px-4 py-3 ${
                        mine
                          ? "border-[#3ddc84]/25 bg-[#3ddc84]/10"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      {!mine && (
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[0.7rem] font-semibold tracking-wide text-white/90">
                            {message.username}
                          </span>
                          <span className="text-[0.55rem] uppercase tracking-[0.25em] text-white/30">
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                      )}
                      <p className={`mt-1 whitespace-pre-line text-sm ${mine ? "text-white" : "text-white/90"}`}>
                        {message.text}
                      </p>
                      {mine && (
                        <div className="mt-1 text-right text-[0.55rem] uppercase tracking-[0.25em] text-white/30">
                          {formatTimestamp(message.timestamp)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
          <form className="mt-4 flex gap-3" onSubmit={handleChatSubmit}>
            <input
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              placeholder={
                canAnswer
                  ? "Answer: type A/B/C/D + Enter (or tap above)"
                  : "Message the room..."
              }
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
