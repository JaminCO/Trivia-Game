"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { matchmakingAPI } from "@/lib/api";

// ─── Data ────────────────────────────────────────────────────────────────────

const GAME_MODES = [
  {
    id: "trivia",
    name: "Trivia",
    icon: "🧠",
    description: "Answer questions correctly to score points",
    tag: "CLASSIC",
  },
  {
    id: "fastest-fingers",
    name: "Fastest Fingers",
    icon: "⚡",
    description: "Race to answer questions fastest",
    tag: "SPEED",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [selectedGameMode, setSelectedGameMode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  const handleJoin = async () => {
    if (!selectedGameMode) return;
    setJoining(true);
    setJoinError("");
    try {
      const result = await matchmakingAPI.join(selectedGameMode);
      router.push(`/room/${result.room_id}`);
    } catch (err: any) {
      setJoinError(err?.response?.data?.detail ?? "Failed to join. Please try again.");
      setJoining(false);
    }
  };

  if (!loading && !user) {
    return null;
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080808]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-[#e8c84a] border-t-transparent animate-spin" />
          <p className="font-mono2 text-[0.72rem] tracking-[0.2em] uppercase text-white/30">Loading...</p>
        </div>
      </main>
    );
  }

  const selectedMode = GAME_MODES.find((m) => m.id === selectedGameMode);

  return (
    <>
      {/* Keyframe injections */}
      <style>{`
        @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-20px,30px)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-20px)} }
      `}</style>

      <main className="relative min-h-screen bg-[#080808] text-[#f5f0e8] font-syne overflow-x-hidden">

        {/* Noise overlay */}
        <div
          className="fixed inset-0 pointer-events-none z-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Ambient blobs */}
        <div className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none -z-0"
          style={{ background: "radial-gradient(circle, rgba(232,200,74,0.07) 0%, transparent 70%)", filter: "blur(100px)", animation: "float1 14s ease-in-out infinite" }} />
        <div className="fixed bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none -z-0"
          style={{ background: "radial-gradient(circle, rgba(240,106,43,0.06) 0%, transparent 70%)", filter: "blur(100px)", animation: "float2 11s ease-in-out infinite" }} />

        {/* ── NAV ── */}
        <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/8 backdrop-blur-xl bg-[#080808]/80 sm:px-10">
          <div className="font-bebas text-[1.5rem] tracking-widest text-[#e8c84a]">
            Play<span className="text-[#f06a2b]">Trivia</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 border border-white/10 px-4 py-2">
              <span className="font-mono2 text-[0.68rem] tracking-widest text-white/40 uppercase">Coins</span>
              <span className="font-bebas text-[1.2rem] text-[#e8c84a] leading-none">{user?.coins ?? 0}</span>
              <span className="text-sm">🪙</span>
            </div>
            <button
              onClick={logout}
              className="font-mono2 text-[0.68rem] tracking-widest uppercase border border-white/10 px-4 py-2 text-white/50 hover:border-white/30 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </nav>

        <div className="relative z-10 mx-auto max-w-5xl px-6 py-10 sm:px-10 space-y-6">

          {/* ── HERO PROFILE CARD ── */}
          <section className="relative overflow-hidden border border-white/10 p-8 sm:p-10">
            {/* Background grid */}
            <div className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: "linear-gradient(rgba(232,200,74,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(232,200,74,0.06) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }} />
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e8c84a] to-transparent" />

            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                {user?.profile_picture ? (
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full border-2 border-[#e8c84a]/50 scale-110" />
                    {/* <Image
                      src={user.profile_picture}
                      alt={user.username}
                      width={72}
                      height={72}
                      className="relative rounded-full border border-white/20"
                    /> */}
                  </div>
                ) : (
                  <div className="w-[72px] h-[72px] rounded-full border border-[#e8c84a]/30 bg-[#e8c84a]/10 flex items-center justify-center font-bebas text-[2rem] text-[#e8c84a]">
                    {user?.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div>
                  <p className="font-mono2 text-[0.62rem] tracking-[0.2em] uppercase text-white/30 mb-1">Player</p>
                  <h1 className="font-bebas text-[2.2rem] sm:text-[2.8rem] leading-none tracking-wide text-[#f5f0e8]">
                    {user?.username}
                  </h1>
                  <p className="font-mono2 text-[0.68rem] tracking-widest text-[#3ddc84] mt-1 flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#3ddc84] animate-pulse" />
                    Online
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex gap-px">
                {[
                  { label: "Coins", value: user?.coins ?? 0, icon: "🪙", accent: "text-[#e8c84a]" },
                  { label: "Wins",  value: 0,                icon: "🏆", accent: "text-[#f06a2b]" },
                  { label: "Rank",  value: "—",              icon: "📊", accent: "text-white/60" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/[0.03] border border-white/8 px-5 py-4 text-center min-w-[80px]">
                    <div className={`font-bebas text-[1.8rem] leading-none ${s.accent}`}>{s.value}</div>
                    <div className="font-mono2 text-[0.55rem] tracking-widest uppercase text-white/30 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── GAME MODE SELECTION ── */}
          <section className="border border-white/8 p-8 sm:p-10">
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <p className="font-mono2 text-[0.62rem] tracking-[0.2em] uppercase text-[#f06a2b] mb-2">Game Mode</p>
                <h2 className="font-bebas text-[1.8rem] sm:text-[2.4rem] leading-none tracking-wide">
                  Choose your battle
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5 mt-8">
              {GAME_MODES.map((mode) => {
                const active = selectedGameMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedGameMode(mode.id)}
                    className={`relative group text-left p-8 transition-all duration-200 border ${
                      active
                        ? "border-[#e8c84a] bg-[#e8c84a]/[0.05]"
                        : "border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.03]"
                    }`}
                  >
                    {/* Top accent on active */}
                    {active && (
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e8c84a] to-transparent" />
                    )}
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-[2rem]">{mode.icon}</span>
                      <span className={`font-mono2 text-[0.56rem] tracking-[0.15em] px-2 py-1 border ${
                        active ? "border-[#e8c84a]/40 text-[#e8c84a]" : "border-white/10 text-white/30"
                      }`}>
                        {mode.tag}
                      </span>
                    </div>
                    <h3 className={`font-bebas text-[1.6rem] tracking-wide leading-none mb-2 ${active ? "text-[#e8c84a]" : "text-[#f5f0e8]"}`}>
                      {mode.name}
                    </h3>
                    <p className="font-syne text-[0.82rem] leading-[1.6] text-white/40">{mode.description}</p>
                    {active && (
                      <div className="mt-4 font-mono2 text-[0.6rem] tracking-[0.15em] uppercase text-[#3ddc84] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3ddc84]" />
                        Selected
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {joinError && (
              <p className="mt-2 font-mono2 text-[0.68rem] tracking-widest text-red-400">{joinError}</p>
            )}
            <button
              disabled={!selectedGameMode || joining}
              onClick={handleJoin}
              className={`mt-0.5 w-full relative overflow-hidden font-bebas text-[1.3rem] tracking-widest py-5 transition-all duration-200 group ${
                selectedGameMode && !joining
                  ? "bg-[#e8c84a] text-[#080808] hover:bg-[#f06a2b]"
                  : "bg-white/5 text-white/20 cursor-not-allowed"
              }`}
            >
              {joining ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-[#080808] border-t-transparent animate-spin" />
                  Finding room...
                </span>
              ) : selectedGameMode ? (
                <span className="relative z-10">Enter {selectedMode?.name} →</span>
              ) : (
                "Select a mode to play"
              )}
            </button>
          </section>

          {/* ── QUICK LINKS ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5 pb-10">
            <Link
              href="/admin"
              className="group flex items-center justify-between border border-white/8 px-6 py-4 hover:border-[#e8c84a]/40 hover:bg-[#e8c84a]/[0.03] transition-all"
            >
              <div>
                <p className="font-mono2 text-[0.58rem] tracking-[0.15em] uppercase text-white/30 mb-1">Internal</p>
                <span className="font-syne font-bold text-[0.95rem]">Admin Dashboard</span>
              </div>
              <span className="font-bebas text-[1.2rem] text-white/20 group-hover:text-[#e8c84a] transition-colors">→</span>
            </Link>
            <button
              className="group flex items-center justify-between border border-white/8 px-6 py-4 hover:border-[#f06a2b]/40 hover:bg-[#f06a2b]/[0.03] transition-all text-left"
            >
              <div>
                <p className="font-mono2 text-[0.58rem] tracking-[0.15em] uppercase text-white/30 mb-1">Wallet</p>
                <span className="font-syne font-bold text-[0.95rem]">Buy Coins</span>
              </div>
              <span className="font-bebas text-[1.2rem] text-white/20 group-hover:text-[#f06a2b] transition-colors">🪙</span>
            </button>
          </div>

        </div>
      </main>
    </>
  );
}
