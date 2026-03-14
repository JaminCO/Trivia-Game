"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface Question {
  question_index: number;
  total_questions: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  difficulty: string;
  time_limit: number;
}

interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  score: number;
}

interface AnswerResult {
  question_index: number;
  correct_answer: string;
  answers: Record<string, { answer: string; correct: boolean; score: number }>;
}

const OPTION_KEYS = ["A", "B", "C", "D"] as const;
const OPTION_LABELS: Record<string, keyof Question> = {
  A: "option_a",
  B: "option_b",
  C: "option_c",
  D: "option_d",
};

export default function GamePage({ params }: { params: { roomCode: string } }) {
  const { roomCode } = params;
  const router = useRouter();
  const { user, loading } = useAuth();

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(0);

  const [status, setStatus] = useState("connecting");
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameOver, setGameOver] = useState(false);
  const [scoreFlash, setScoreFlash] = useState<number | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const wsUrl = baseUrl.replace(/^http/, "ws") + `/ws/room/${roomCode}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      ws.send(JSON.stringify({ event: "game_started" }));
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      switch (msg.event) {
        case "question": {
          setSelectedAnswer(null);
          setAnswerResult(null);
          setScoreFlash(null);
          setQuestion(msg as Question);
          setTimeLeft(msg.time_limit ?? 30);
          questionStartRef.current = Date.now();
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
              if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
              return prev - 1;
            });
          }, 1000);
          break;
        }
        case "answer_result": {
          if (timerRef.current) clearInterval(timerRef.current);
          setAnswerResult(msg as AnswerResult);
          break;
        }
        case "answer_accepted": {
          if (msg.score_awarded > 0) {
            setScoreFlash(msg.score_awarded);
            setTimeout(() => setScoreFlash(null), 2000);
          }
          break;
        }
        case "leaderboard": {
          setLeaderboard(msg.leaderboard as LeaderboardEntry[]);
          break;
        }
        case "game_over": {
          if (timerRef.current) clearInterval(timerRef.current);
          setLeaderboard(msg.leaderboard as LeaderboardEntry[]);
          setGameOver(true);
          setTimeout(() => router.push(`/results/${roomCode}`), 3000);
          break;
        }
      }
    };

    ws.onclose = () => setStatus("disconnected");

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      ws.close();
    };
  }, [loading, user, roomCode]);

  const submitAnswer = (answer: string) => {
    if (selectedAnswer || !question || !wsRef.current) return;
    setSelectedAnswer(answer);
    const elapsed = (Date.now() - questionStartRef.current) / 1000;
    wsRef.current.send(JSON.stringify({
      event: "submit_answer",
      question_index: question.question_index,
      answer,
      elapsed_seconds: elapsed,
    }));
  };

  const timePct = question ? (timeLeft / (question.time_limit ?? 30)) * 100 : 100;
  const myEntry = leaderboard.find((e) => e.user_id === user?.id);

  const getAnswerStyle = (key: string) => {
    const base = "w-full text-left px-5 py-4 border font-syne text-[0.95rem] transition-all duration-200 ";
    if (!answerResult) {
      if (selectedAnswer === key) return base + "border-[#e8c84a] bg-[#e8c84a]/10 text-[#e8c84a] cursor-default";
      if (selectedAnswer) return base + "border-white/8 bg-white/[0.02] text-white/40 cursor-default";
      return base + "border-white/10 bg-white/[0.02] text-[#f5f0e8] hover:border-[#e8c84a]/50 hover:bg-[#e8c84a]/[0.04] cursor-pointer";
    }
    const correct = answerResult.correct_answer.toUpperCase();
    if (key === correct) return base + "border-[#3ddc84] bg-[#3ddc84]/10 text-[#3ddc84] cursor-default";
    if (key === selectedAnswer && key !== correct) return base + "border-red-500/60 bg-red-500/10 text-red-400 cursor-default";
    return base + "border-white/8 bg-transparent text-white/30 cursor-default";
  };

  if (gameOver) {
    return (
      <main className="min-h-screen bg-[#080808] text-[#f5f0e8] font-syne flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="font-bebas text-[3rem] tracking-widest text-[#e8c84a]">Game Over!</div>
          <p className="font-mono2 text-[0.7rem] tracking-widest text-white/40">Redirecting to results...</p>
        </div>
      </main>
    );
  }

  if (!question) {
    return (
      <main className="min-h-screen bg-[#080808] text-[#f5f0e8] font-syne flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="font-bebas text-[2rem] tracking-widest text-white/40 animate-pulse">Loading game...</div>
          <p className="font-mono2 text-[0.62rem] tracking-widest text-white/20">{status}</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <style>{`
        @keyframes score-pop { 0%{opacity:0;transform:translateY(0) scale(0.8)} 30%{opacity:1;transform:translateY(-20px) scale(1.1)} 100%{opacity:0;transform:translateY(-50px) scale(0.9)} }
        .score-pop { animation: score-pop 1.8s ease-out forwards; }
      `}</style>

      <main className="relative min-h-screen bg-[#080808] text-[#f5f0e8] font-syne flex flex-col items-center px-4 py-6">
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(232,200,74,0.04) 0%, transparent 70%)", filter: "blur(120px)" }} />

        <div className="relative z-10 w-full max-w-4xl flex gap-4 flex-col lg:flex-row">

          {/* Main game area */}
          <div className="flex-1 space-y-4">

            {/* Top bar */}
            <div className="border border-white/10 px-5 py-3 flex items-center justify-between">
              <span className="font-mono2 text-[0.62rem] tracking-[0.2em] uppercase text-white/30">
                Q {question.question_index + 1} / {question.total_questions}
              </span>
              <span className={`font-mono2 text-[0.62rem] tracking-widest uppercase px-2 py-0.5 border ${
                question.difficulty === "easy" ? "border-[#3ddc84]/40 text-[#3ddc84]"
                : question.difficulty === "medium" ? "border-[#e8c84a]/40 text-[#e8c84a]"
                : "border-red-500/40 text-red-400"
              }`}>
                {question.difficulty}
              </span>
              <span className={`font-bebas text-[1.5rem] tracking-wide ${timeLeft <= 5 ? "text-red-400" : "text-[#f5f0e8]"}`}>
                {timeLeft}s
              </span>
            </div>

            {/* Timer bar */}
            <div className="h-1 bg-white/8 overflow-hidden">
              <div className="h-full transition-all duration-1000 ease-linear" style={{
                width: `${timePct}%`,
                background: timePct > 40 ? "linear-gradient(to right, #e8c84a, #f06a2b)" : timePct > 15 ? "#f06a2b" : "#ef4444",
              }} />
            </div>

            {/* Question */}
            <div className="border border-white/10 px-6 py-8 relative">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e8c84a]/30 to-transparent" />
              <p className="font-syne text-[1.1rem] sm:text-[1.25rem] leading-relaxed">{question.question_text}</p>
            </div>

            {/* Answers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {OPTION_KEYS.map((key) => (
                <button key={key} onClick={() => submitAnswer(key)} className={getAnswerStyle(key)}
                  disabled={!!selectedAnswer || !!answerResult || timeLeft === 0}>
                  <span className="font-mono2 text-[0.65rem] tracking-widest mr-3 opacity-50">{key}</span>
                  {question[OPTION_LABELS[key]] as string}
                </button>
              ))}
            </div>

            {/* Result feedback */}
            {answerResult && (
              <div className={`border px-5 py-3 text-center font-mono2 text-[0.7rem] tracking-widest uppercase ${
                !selectedAnswer ? "border-white/20 text-white/40"
                : selectedAnswer.toUpperCase() === answerResult.correct_answer.toUpperCase()
                  ? "border-[#3ddc84]/40 text-[#3ddc84] bg-[#3ddc84]/[0.04]"
                  : "border-red-500/40 text-red-400 bg-red-500/[0.04]"
              }`}>
                {!selectedAnswer ? "Time's up — no answer"
                  : selectedAnswer.toUpperCase() === answerResult.correct_answer.toUpperCase()
                  ? "Correct!" : `Wrong — correct: ${answerResult.correct_answer.toUpperCase()}`}
              </div>
            )}

            {/* Score pop */}
            {scoreFlash !== null && (
              <div className="relative h-0 overflow-visible flex justify-center">
                <span className="score-pop absolute font-bebas text-[2.5rem] text-[#e8c84a] pointer-events-none">
                  +{scoreFlash}
                </span>
              </div>
            )}
          </div>

          {/* Leaderboard sidebar */}
          {leaderboard.length > 0 && (
            <div className="w-full lg:w-56 border border-white/8 p-4 h-fit">
              <h3 className="font-bebas text-[1.1rem] tracking-wide text-white/60 mb-3">Standings</h3>
              <ul className="space-y-1">
                {leaderboard.map((entry) => {
                  const isMe = entry.user_id === user?.id;
                  return (
                    <li key={entry.user_id} className={`flex items-center justify-between px-3 py-2 ${
                      isMe ? "border border-[#e8c84a]/20 bg-[#e8c84a]/[0.03]" : ""
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono2 text-[0.58rem] text-white/30 w-4 flex-shrink-0">#{entry.rank}</span>
                        <span className={`font-syne text-[0.8rem] truncate ${isMe ? "text-[#e8c84a]" : "text-[#f5f0e8]/80"}`}>
                          {entry.username}
                        </span>
                      </div>
                      <span className="font-mono2 text-[0.68rem] text-white/50 flex-shrink-0 ml-2">
                        {entry.score.toLocaleString()}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {myEntry && (
                <div className="mt-3 pt-3 border-t border-white/8 text-center">
                  <p className="font-mono2 text-[0.58rem] text-white/30 tracking-widest">YOUR SCORE</p>
                  <p className="font-bebas text-[1.8rem] text-[#e8c84a]">{myEntry.score.toLocaleString()}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
