"use client";

// ─────────────────────────────────────────────────────────────
//  TriviaWars Landing Page  —  Next.js (App Router)
//
//  Drop this file into:  app/page.tsx  (or app/(marketing)/page.tsx)
//
//  Requirements:
//    1. Add Bebas Neue + DM Mono + Syne to your Next.js project:
//       In app/layout.tsx (or pages/_app.tsx) add:
//
//         import { Bebas_Neue, DM_Mono, Syne } from "next/font/google";
//         export const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" });
//         export const dmMono    = DM_Mono({ weight: ["400","500"], subsets: ["latin"], variable: "--font-mono" });
//         export const syne      = Syne({ weight: ["400","700","800"], subsets: ["latin"], variable: "--font-syne" });
//
//       Then wrap <body> with: className={`${bebasNeue.variable} ${dmMono.variable} ${syne.variable}`}
//
//    2. In tailwind.config.ts extend fontFamily:
//         fontFamily: {
//           bebas: ["var(--font-bebas)"],
//           mono2: ["var(--font-mono)"],
//           syne: ["var(--font-syne)"],
//         }
//
//    3. No extra npm packages needed.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";

// ── Sub-components ──────────────────────────────────────────

function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ mx: 0, my: 0, rx: 0, ry: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pos.current.mx = e.clientX;
      pos.current.my = e.clientY;
    };
    window.addEventListener("mousemove", onMove);

    let raf: number;
    const animate = () => {
      const p = pos.current;
      p.rx += (p.mx - p.rx) * 0.12;
      p.ry += (p.my - p.ry) * 0.12;
      if (dotRef.current) {
        dotRef.current.style.left = `${p.mx}px`;
        dotRef.current.style.top = `${p.my}px`;
      }
      if (ringRef.current) {
        ringRef.current.style.left = `${p.rx}px`;
        ringRef.current.style.top = `${p.ry}px`;
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    const onEnter = () => {
      dotRef.current?.classList.add("scale-[1.8]");
      ringRef.current?.classList.add("!w-14", "!h-14");
    };
    const onLeave = () => {
      dotRef.current?.classList.remove("scale-[1.8]");
      ringRef.current?.classList.remove("!w-14", "!h-14");
    };
    document.querySelectorAll("button, a").forEach((el) => {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    });

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="fixed z-[9999] pointer-events-none -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#e8c84a] mix-blend-difference transition-transform duration-100"
      />
      <div
        ref={ringRef}
        className="fixed z-[9998] pointer-events-none -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-[#e8c84a] opacity-50 transition-all duration-300"
      />
    </>
  );
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("!opacity-100", "!translate-y-0")),
      { threshold: 0.12 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

function LiveCounter({ target, interval = 4000 }: { target: number; interval?: number }) {
  const [value, setValue] = useState(target);
  useEffect(() => {
    const id = setInterval(() => {
      const next = target + Math.floor(Math.random() * 120 - 60);
      setValue(next);
    }, interval);
    return () => clearInterval(id);
  }, [target, interval]);
  return <>{value.toLocaleString()}</>;
}

// ── Data ────────────────────────────────────────────────────

const STEPS = [
  { num: "01", icon: "🎮", title: "Join or create a room", desc: "Pick a topic, set a stake, invite players — or drop into any live public room with one tap." },
  { num: "02", icon: "⚡", title: "Questions hit the chat", desc: "Every question appears in real-time. The server timestamps everything — no client-side cheating possible." },
  { num: "03", icon: "🏆", title: "First correct answer wins", desc: "Edge functions validate answers server-side. Fastest correct response takes the round — fair for every device." },
  { num: "04", icon: "💰", title: "Collect your coins", desc: "Win rounds, earn coins. Cash out via Paystack (₦) or USDT. Payouts processed in seconds." },
];

const FEATURES = [
  { tag: "Real-time", icon: "⚡", title: "Supabase Realtime Core", desc: "Every message, question, and winner event is pushed over WebSockets. No polling. No stale data." },
  { tag: "Fair play", icon: "🔒", title: "Server-side validation", desc: "All winners are determined by Edge Functions — never the client. No timing exploits, no spoofing." },
  { tag: "Mobile-first", icon: "📱", title: "Web → Ionic → App Store", desc: "One codebase ships as web, Android, and iOS. Your game works everywhere you do." },
  { tag: "Rewards", icon: "💰", title: "Paystack + USDT", desc: "Buy coins in Naira via Paystack or USDT. Withdraw instantly — no days-long processing." },
  { tag: "Social", icon: "👥", title: "Private & public rooms", desc: "Challenge friends or battle strangers. Custom room codes, invite links, and spectator mode." },
  { tag: "Competition", icon: "🏅", title: "Global leaderboard", desc: "Daily, weekly, and all-time rankings. Your streak matters. Your reputation follows you." },
];

const LEADERBOARD = [
  { rank: 1, emoji: "🦁", name: "TechBoy_NG", pts: "48,200", badge: "🔥 Streak 14", bg: "bg-yellow-500/10" },
  { rank: 2, emoji: "🦊", name: "SaraQuiz", pts: "41,750", badge: "⚡ Fast", bg: "bg-white/5" },
  { rank: 3, emoji: "🐆", name: "ChisomoK", pts: "38,100", badge: "", bg: "bg-orange-500/10" },
  { rank: 4, emoji: "🎯", name: "Kofi_Plays", pts: "29,400", badge: "", bg: "bg-white/5" },
  { rank: 5, emoji: "🌟", name: "Amara_W", pts: "22,900", badge: "", bg: "bg-white/5" },
];

const TICKER_ITEMS = [
  "⚡ @ChisomoK just won Round 14",
  "🏆 Room NAIJA-42 — Final round starting",
  "💰 @TechBoy_NG earned 500 coins",
  "🔥 GEOGRAPHY room — 24 players competing",
  "⚡ @SaraQuiz is on a 9-game streak",
  "🎯 New daily challenge: World Capitals",
];

const PRICING = [
  {
    label: "Starter", amount: "₦500", sub: "~200 coins", featured: false,
    features: ["200 game coins", "Enter any public room", "No expiry"],
    cta: "Buy Starter",
  },
  {
    label: "Competitor", amount: "₦2,000", sub: "~1,000 coins + 200 bonus", featured: true,
    features: ["1,200 game coins", "Private room creation", "Priority matchmaking", "20% bonus coins"],
    cta: "Buy Competitor",
  },
  {
    label: "Champion", amount: "USDT", sub: "Any amount · crypto", featured: false,
    features: ["Flexible top-up", "USDT / stablecoins", "Instant credit", "Best rates for high volume"],
    cta: "Pay with Crypto",
  },
];

// ── Page ─────────────────────────────────────────────────────

export default function LandingPage() {
  useReveal();

  const router = useRouter();
  const { user, loading } = useAuth();
  const goPlay = () => {
    if (loading) return;
    router.push(user ? "/dashboard" : "/login");
  };

  return (
    <div className="bg-[#080808] text-[#f5f0e8] font-syne overflow-x-hidden cursor-none">
      {/* Noise overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[9000] opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <Cursor />

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-5 border-b border-white/10 backdrop-blur-xl bg-[#080808]/70">
        <div className="font-bebas text-[1.6rem] tracking-widest text-[#e8c84a]">
          Play<span className="text-[#f06a2b]">Trivia</span>
        </div>
        <div className="hidden md:flex gap-8 items-center">
          {["How it works", "Features", "Leaderboard", "Coins"].map((l) => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`}
              className="font-mono2 text-[0.72rem] tracking-widest uppercase text-white/40 hover:text-white transition-colors cursor-none">
              {l}
            </a>
          ))}
        </div>
        <button onClick={goPlay} className="font-mono2 text-[0.72rem] tracking-widest uppercase bg-[#e8c84a] text-[#080808] px-5 py-2.5 hover:bg-[#f06a2b] transition-colors font-medium cursor-none">
          Play Now →
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col justify-center px-10 pt-32 pb-20 overflow-hidden">
        {/* Grid */}
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            backgroundImage: "linear-gradient(rgba(245,240,232,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(245,240,232,0.06) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
          }}
        />
        {/* Blobs */}
        <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(232,200,74,0.15) 0%, transparent 70%)", filter: "blur(100px)", animation: "float1 12s ease-in-out infinite" }} />
        <div className="absolute bottom-0 -left-12 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(240,106,43,0.12) 0%, transparent 70%)", filter: "blur(100px)", animation: "float2 10s ease-in-out infinite" }} />

        <div className="relative z-10">
          <div className="font-mono2 text-[0.72rem] tracking-[0.2em] uppercase text-[#3ddc84] mb-6 flex items-center gap-3">
            <span className="w-8 h-px bg-[#3ddc84]" />
            <span className="inline-block w-2 h-2 rounded-full bg-[#3ddc84] animate-pulse" />
            Live multiplayer · Real prizes · Zero lag
          </div>

          <h1 className="font-bebas leading-[0.92] tracking-wide">
            <span className="block text-[clamp(5rem,14vw,13rem)] text-[#f5f0e8]">Answer</span>
            <span className="block text-[clamp(5rem,14vw,13rem)]"
              style={{ WebkitTextStroke: "2px #e8c84a", color: "transparent" }}>
              Faster
            </span>
            <span className="block text-[clamp(5rem,14vw,13rem)] text-[#f06a2b]">Win More</span>
          </h1>

          <p className="mt-10 max-w-[480px] text-[1.05rem] leading-[1.7] text-white/60">
            Real-time trivia battles. Race against live players, earn coins, climb the leaderboard. One codebase, infinite rooms — built for speed.
          </p>

          <div className="flex gap-4 mt-12 flex-wrap">
            <button onClick={goPlay} className="relative font-bebas text-[1.2rem] tracking-widest bg-[#e8c84a] text-[#080808] px-11 py-4 overflow-hidden group cursor-none">
              <span className="absolute inset-0 bg-[#f06a2b] translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-300" />
              <span className="relative z-10">Enter a Room →</span>
            </button>
            <button className="font-mono2 text-[0.78rem] tracking-widest uppercase border border-white/12 px-9 py-4 hover:border-white transition-colors cursor-none">
              Watch Live Game
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="absolute bottom-10 left-10 flex gap-12 flex-wrap">
          {[
            { num: <><LiveCounter target={2847} /></>, label: <><span className="inline-block w-2 h-2 rounded-full bg-[#3ddc84] animate-pulse mr-1.5" />Players online</> },
            { num: <LiveCounter target={143} interval={4000} />, label: "Active rooms" },
            { num: "₦2.4M", label: "Paid out today" },
          ].map((s, i) => (
            <div key={i}>
              <div className="font-bebas text-[2.4rem] text-[#e8c84a] leading-none">{s.num as React.ReactNode}</div>
              <div className="font-mono2 text-[0.65rem] tracking-widest uppercase text-white/40 mt-1">{s.label as React.ReactNode}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="overflow-hidden bg-[#e8c84a] py-3 whitespace-nowrap">
        <div className="inline-flex" style={{ animation: "ticker 30s linear infinite" }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="font-bebas text-[1rem] tracking-widest text-[#080808] px-8">
              {item} <span className="text-[#f06a2b]">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="px-10 py-28">
        <div className="font-mono2 text-[0.68rem] tracking-[0.22em] uppercase text-[#f06a2b] mb-4">Process</div>
        <h2 className="font-bebas text-[clamp(2.5rem,5vw,4.5rem)] leading-none tracking-wide mb-16 reveal opacity-0 translate-y-7 transition-all duration-700">
          How the game works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0.5">
          {STEPS.map((s) => (
            <div key={s.num}
              className="reveal opacity-0 translate-y-7 transition-all duration-700 bg-[#1a1a1a] p-12 relative overflow-hidden group hover:bg-[#141414]">
              <div className="absolute top-6 right-7 font-bebas text-[5rem] leading-none text-white/[0.04] select-none">{s.num}</div>
              <div className="text-[2rem] mb-5">{s.icon}</div>
              <div className="font-syne font-bold text-[1.2rem] mb-3">{s.title}</div>
              <p className="text-[0.9rem] leading-[1.7] text-white/50">{s.desc}</p>
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#e8c84a] to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
            </div>
          ))}
        </div>
      </section>

      {/* ── GAME PREVIEW ── */}
      <section className="px-10 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div>
            <div className="font-mono2 text-[0.68rem] tracking-[0.22em] uppercase text-[#f06a2b] mb-4 reveal opacity-0 translate-y-7 transition-all duration-700">Live preview</div>
            <h2 className="font-bebas text-[clamp(2.5rem,5vw,4.5rem)] leading-none tracking-wide mb-6 reveal opacity-0 translate-y-7 transition-all duration-700">
              It plays like<br />a chat. It hits<br />like a game.
            </h2>
            <p className="text-[0.95rem] leading-[1.8] text-white/50 max-w-[400px] reveal opacity-0 translate-y-7 transition-all duration-700">
              No clunky UI. No page reloads. Questions stream into the room like messages — you type your answer before anyone else does. Pure adrenaline.
            </p>
            <div className="flex gap-5 mt-8 flex-wrap reveal opacity-0 translate-y-7 transition-all duration-700">
              {[{ val: "≤80ms", label: "Avg answer latency", color: "text-[#e8c84a]" }, { val: "10K+", label: "Concurrent players", color: "text-[#f06a2b]" }].map((s) => (
                <div key={s.label} className="border border-white/10 px-6 py-4">
                  <div className={`font-bebas text-[2rem] ${s.color}`}>{s.val}</div>
                  <div className="font-mono2 text-[0.62rem] tracking-widest uppercase text-white/40 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Phone mockup */}
          <div className="reveal opacity-0 translate-y-7 transition-all duration-700 flex justify-center">
            <div className="w-[260px] bg-[#111] rounded-[40px] border border-white/10 p-3.5 shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
              <div className="w-20 h-6 bg-black rounded-b-2xl mx-auto mb-3" />
              <div className="bg-[#080808] rounded-[28px] overflow-hidden min-h-[460px] p-4 flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <span className="font-mono2 text-[0.6rem] tracking-widest text-[#e8c84a]">⚡ ROOM: TECH-007</span>
                  <span className="font-mono2 text-[0.55rem] text-white/30">Round 3 / 10</span>
                </div>
                <div className="h-0.5 bg-[#1a1a1a] rounded overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#f06a2b] to-[#e8c84a] rounded"
                    style={{ width: "60%", animation: "timerDrain 10s linear infinite" }} />
                </div>
                <div className="flex flex-col gap-2 flex-1 mt-1">
                  {[
                    { type: "system", text: "🎯 Round 3 starting now!" },
                    { type: "question", sender: "HOST", text: "What language was created by Brendan Eich in 10 days?" },
                    { type: "answer", sender: "@TechBoy_NG", text: "JavaScript" },
                    { type: "answer", sender: "@SaraQuiz", text: "javascript" },
                    { type: "winner", text: "✅ @TechBoy_NG wins! +100 coins" },
                    { type: "system", text: "Next question in 3s..." },
                  ].map((msg, i) => (
                    <div key={i} className={`flex flex-col gap-0.5 ${msg.type === "answer" ? "items-end" : ""}`}>
                      {msg.sender && (
                        <span className={`font-mono2 text-[0.5rem] tracking-wide text-white/30 ${msg.type === "answer" ? "pr-2" : "pl-2"}`}>
                          {msg.sender}
                        </span>
                      )}
                      <div className={`text-[0.7rem] leading-[1.5] px-3 py-2 rounded-xl max-w-[85%] ${
                        msg.type === "system"   ? "bg-yellow-400/10 border border-yellow-400/25 text-[#e8c84a] font-mono2 text-[0.62rem] text-center max-w-full rounded-lg" :
                        msg.type === "question" ? "bg-orange-500/12 border border-orange-500/30 text-white font-semibold" :
                        msg.type === "answer"   ? "bg-[#1c1c1c] text-white/80 rounded-xl rounded-br-sm" :
                        "bg-green-400/10 border border-green-400/30 text-[#3ddc84] font-mono2 text-[0.62rem] text-center max-w-full rounded-lg"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-auto flex gap-1.5 items-center bg-[#111] rounded-2xl border border-white/8 px-3 py-2">
                  <span className="font-mono2 text-[0.62rem] text-white/30 flex-1">Type your answer...</span>
                  <span className="w-6 h-6 rounded-full bg-[#e8c84a] flex items-center justify-center text-[0.6rem] text-black font-bold flex-shrink-0">→</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="px-10 py-28 bg-[#1a1a1a]">
        <div className="font-mono2 text-[0.68rem] tracking-[0.22em] uppercase text-[#f06a2b] mb-4">Built different</div>
        <h2 className="font-bebas text-[clamp(2.5rem,5vw,4.5rem)] leading-none tracking-wide mb-16 reveal opacity-0 translate-y-7 transition-all duration-700">
          Why players stay
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title}
              className="reveal opacity-0 translate-y-7 transition-all duration-700 border border-white/10 p-10 hover:border-[#e8c84a] hover:-translate-y-1 transition-[border-color,transform] duration-300">
              <span className="font-mono2 text-[0.6rem] tracking-[0.14em] uppercase border border-white/10 text-white/40 px-2.5 py-1 inline-block mb-6">{f.tag}</span>
              <div className="text-[1.8rem] mb-4">{f.icon}</div>
              <div className="font-syne font-bold text-[1.1rem] mb-2.5">{f.title}</div>
              <p className="text-[0.875rem] leading-[1.7] text-white/50">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── LEADERBOARD ── */}
      <section id="leaderboard" className="px-10 py-28 bg-[#1a1a1a] relative overflow-hidden">
        <div className="absolute -right-10 top-1/2 -translate-y-1/2 font-bebas text-[30vw] leading-none text-white/[0.02] pointer-events-none select-none">
          TOP
        </div>
        <div className="font-mono2 text-[0.68rem] tracking-[0.22em] uppercase text-[#f06a2b] mb-4">Top players</div>
        <h2 className="font-bebas text-[clamp(2.5rem,5vw,4.5rem)] leading-none tracking-wide mb-16 reveal opacity-0 translate-y-7 transition-all duration-700">
          Global standings
        </h2>
        <div className="max-w-[600px]">
          {LEADERBOARD.map((p) => (
            <div key={p.rank}
              className="reveal opacity-0 translate-y-7 transition-all duration-700 flex items-center gap-5 py-4 border-b border-white/8 hover:pl-3 transition-all duration-200">
              <span className={`font-bebas w-9 text-center ${
                p.rank === 1 ? "text-[1.4rem] text-[#e8c84a]" :
                p.rank === 2 ? "text-[1.4rem] text-[#aaa]" :
                p.rank === 3 ? "text-[1.4rem] text-[#c87941]" :
                "text-[1rem] text-white/30"
              }`}>{p.rank}</span>
              <div className={`w-9 h-9 rounded-full ${p.bg} flex items-center justify-center text-[1rem] flex-shrink-0`}>{p.emoji}</div>
              <span className="flex-1 font-syne font-bold text-[0.95rem]">{p.name}</span>
              <span className="font-mono2 text-[0.8rem] text-[#e8c84a]">{p.pts} pts</span>
              {p.badge && (
                <span className="font-mono2 text-[0.6rem] tracking-widest px-2 py-1 bg-yellow-400/10 border border-yellow-400/30 text-[#e8c84a]">
                  {p.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="coins" className="px-10 py-28">
        <div className="font-mono2 text-[0.68rem] tracking-[0.22em] uppercase text-[#f06a2b] mb-4">Coins</div>
        <h2 className="font-bebas text-[clamp(2.5rem,5vw,4.5rem)] leading-none tracking-wide mb-16 reveal opacity-0 translate-y-7 transition-all duration-700">
          Load up and play
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0.5 max-w-[900px]">
          {PRICING.map((p) => (
            <div key={p.label}
              className={`reveal opacity-0 translate-y-7 transition-all duration-700 relative p-12 ${p.featured ? "bg-[#e8c84a] text-[#080808]" : "bg-[#1a1a1a]"}`}>
              {p.featured && (
                <span className="absolute top-5 right-5 font-mono2 text-[0.6rem] tracking-widest bg-[#080808] text-[#e8c84a] px-2.5 py-1">POPULAR</span>
              )}
              <div className={`font-mono2 text-[0.65rem] tracking-[0.2em] uppercase mb-6 ${p.featured ? "opacity-60" : "text-white/40"}`}>{p.label}</div>
              <div className={`font-bebas text-[3.5rem] leading-none mb-2 ${p.featured ? "text-[#080808]" : ""}`}>{p.amount}</div>
              <div className={`font-mono2 text-[0.8rem] tracking-widest mb-8 ${p.featured ? "opacity-60" : "text-white/40"}`}>{p.sub}</div>
              <ul className="space-y-0 mb-10">
                {p.features.map((f) => (
                  <li key={f} className={`flex gap-2.5 text-[0.875rem] leading-[1.6] py-2 border-b ${p.featured ? "border-black/10 text-[#080808]" : "border-white/8 text-white/60"}`}>
                    <span className="opacity-50">→</span>{f}
                  </li>
                ))}
              </ul>
              <button className={`w-full font-bebas text-[1.1rem] tracking-widest py-3.5 cursor-none transition-opacity hover:opacity-80 ${p.featured ? "bg-[#080808] text-[#e8c84a]" : "bg-[#f5f0e8] text-[#080808]"}`}>
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative px-10 py-36 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(232,200,74,0.07) 0%, transparent 70%)" }} />
        <h2 className="font-bebas text-[clamp(3rem,8vw,7rem)] leading-none mb-6 reveal opacity-0 translate-y-7 transition-all duration-700">
          Ready to<br /><span className="text-[#e8c84a]">dominate?</span>
        </h2>
        <p className="text-[1rem] text-white/50 max-w-[400px] mx-auto mb-12 leading-[1.7] reveal opacity-0 translate-y-7 transition-all duration-700">
          Join thousands of players. Real questions. Real money. Real fast.
        </p>
        <div className="flex gap-4 justify-center flex-wrap reveal opacity-0 translate-y-7 transition-all duration-700">
          <button onClick={goPlay} className="relative font-bebas text-[1.2rem] tracking-widest bg-[#e8c84a] text-[#080808] px-11 py-4 overflow-hidden group cursor-none">
            <span className="absolute inset-0 bg-[#f06a2b] translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-300" />
            <span className="relative z-10">Enter a Room →</span>
          </button>
          <button className="font-mono2 text-[0.78rem] tracking-widest uppercase border border-white/12 px-9 py-4 hover:border-white transition-colors cursor-none">
            Download App (Soon)
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/10 px-10 py-10 flex flex-wrap justify-between items-center gap-6">
        <div className="font-bebas text-[1.4rem] tracking-widest text-[#e8c84a]">TriviaWars</div>
        <div className="flex gap-7 flex-wrap">
          {["How it works", "Leaderboard", "Fair Play Policy", "Contact"].map((l) => (
            <a key={l} href="#" className="font-mono2 text-[0.65rem] tracking-widest uppercase text-white/35 hover:text-white transition-colors cursor-none">{l}</a>
          ))}
        </div>
        <div className="font-mono2 text-[0.62rem] text-white/20 w-full">
          © 2026 TriviaWars. Built on Supabase + Ionic. All game logic is server-validated.
        </div>
      </footer>

      {/* ── KEYFRAMES (injected as style tag) ── */}
      <style>{`
        @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-30px,40px)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-30px)} }
        @keyframes ticker  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes timerDrain { 0%{width:90%} 100%{width:5%} }
      `}</style>
    </div>
  );
}