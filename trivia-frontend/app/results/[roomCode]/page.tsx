"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { gameAPI } from "@/lib/api";

interface ResultEntry {
  rank: number;
  user_id: number;
  username: string;
  score: number;
}

const RANK_ICONS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function ResultsPage({ params }: { params: { roomCode: string } }) {
  const { roomCode } = params;
  const router = useRouter();
  const { user, loading } = useAuth();

  const [results, setResults] = useState<ResultEntry[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }

    gameAPI.getResults(roomCode)
      .then((data) => setResults(data.results ?? []))
      .catch(() => setFetchError("Could not load results. The game may still be processing."))
      .finally(() => setFetching(false));
  }, [loading, user, roomCode]);

  const myEntry = results.find((e) => e.user_id === user?.id);
  const winner = results[0];

  return (
    <main className="relative min-h-screen bg-[#080808] text-[#f5f0e8] font-syne flex items-center justify-center px-4 py-8">
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(232,200,74,0.05) 0%, transparent 70%)", filter: "blur(100px)" }} />

      <div className="relative z-10 w-full max-w-xl space-y-4">

        {/* Header */}
        <div className="border border-white/10 px-6 py-8 text-center relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e8c84a] to-transparent" />
          <p className="font-mono2 text-[0.62rem] tracking-[0.2em] uppercase text-white/30 mb-2">Room {roomCode}</p>
          <h1 className="font-bebas text-[3rem] tracking-widest text-[#e8c84a]">Final Results</h1>
          {winner && !fetching && (
            <p className="font-mono2 text-[0.72rem] tracking-widest text-white/40 mt-1">
              Winner: <span className="text-[#f5f0e8]">{winner.username}</span>
            </p>
          )}
        </div>

        {/* Results list */}
        <div className="border border-white/8 p-6">
          {fetching && (
            <p className="font-mono2 text-[0.68rem] tracking-widest text-white/30 text-center py-6 animate-pulse">
              Loading results...
            </p>
          )}
          {fetchError && (
            <p className="font-mono2 text-[0.68rem] tracking-widest text-red-400/70 text-center py-6">{fetchError}</p>
          )}
          {!fetching && !fetchError && results.length === 0 && (
            <p className="font-mono2 text-[0.68rem] tracking-widest text-white/30 text-center py-6">No results found.</p>
          )}
          {!fetching && results.length > 0 && (
            <ul className="space-y-2">
              {results.map((entry) => {
                const isMe = entry.user_id === user?.id;
                const isWinner = entry.rank === 1;
                return (
                  <li key={entry.user_id} className={`flex items-center justify-between px-5 py-4 border ${
                    isWinner ? "border-[#e8c84a]/40 bg-[#e8c84a]/[0.04]"
                    : isMe ? "border-white/15 bg-white/[0.03]"
                    : "border-white/8"
                  }`}>
                    <div className="flex items-center gap-4">
                      <span className="text-xl w-6 text-center">
                        {RANK_ICONS[entry.rank] ?? (
                          <span className="font-mono2 text-[0.65rem] text-white/30">#{entry.rank}</span>
                        )}
                      </span>
                      <div>
                        <p className={`font-syne text-[0.95rem] ${isWinner ? "text-[#e8c84a]" : "text-[#f5f0e8]"}`}>
                          {entry.username}
                          {isMe && (
                            <span className="ml-2 font-mono2 text-[0.52rem] tracking-widest uppercase text-white/30">you</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bebas text-[1.6rem] leading-none ${isWinner ? "text-[#e8c84a]" : "text-[#f5f0e8]"}`}>
                        {entry.score.toLocaleString()}
                      </p>
                      <p className="font-mono2 text-[0.52rem] tracking-widest text-white/25 uppercase">pts</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* My score summary */}
        {myEntry && (
          <div className="border border-white/8 px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-mono2 text-[0.58rem] tracking-widest uppercase text-white/30">Your rank</p>
              <p className="font-bebas text-[2rem] text-[#f5f0e8]">#{myEntry.rank}</p>
            </div>
            <div className="text-right">
              <p className="font-mono2 text-[0.58rem] tracking-widest uppercase text-white/30">Your score</p>
              <p className="font-bebas text-[2rem] text-[#e8c84a]">{myEntry.score.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex-1 font-bebas text-[1.2rem] tracking-widest py-4 bg-[#e8c84a] text-[#080808] hover:bg-[#f06a2b] transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex-1 font-bebas text-[1.2rem] tracking-widest py-4 border border-white/15 text-white/60 hover:border-white/30 hover:text-white/80 transition-colors"
          >
            Home
          </button>
        </div>

      </div>
    </main>
  );
}
