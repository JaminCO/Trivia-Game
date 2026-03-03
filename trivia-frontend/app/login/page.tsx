"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden" style={{ background: "var(--black, #080808)" }}>
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(245, 240, 232, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 240, 232, 0.12) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      ></div>

      {/* Glow blobs */}
      <div
        className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(232, 200, 74, 0.3) 0%, transparent 70%)" }}
      ></div>
      <div
        className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(240, 106, 43, 0.3) 0%, transparent 70%)" }}
      ></div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <Link href="/" className="mb-12 text-center">
          <div
            className="text-2xl font-bold tracking-widest"
            style={{
              fontFamily: "var(--font-bebas, serif)",
              color: "#e8c84a",
              letterSpacing: "0.12em",
            }}
          >
            Play<span style={{ color: "#f06a2b" }}>Trivia</span>
          </div>
        </Link>

        {/* Card */}
        <div
          className="w-full max-w-md rounded-2xl border p-8 sm:p-10 backdrop-blur-xl"
          style={{
            background: "rgba(8, 8, 8, 0.6)",
            borderColor: "rgba(245, 240, 232, 0.12)",
          }}
        >
          <h1
            className="text-4xl font-bold tracking-tight"
            style={{
              fontFamily: "var(--font-bebas, serif)",
              color: "#f5f0e8",
              letterSpacing: "0.04em",
            }}
          >
            Sign In
          </h1>
          <p
            className="mt-3 text-sm"
            style={{
              color: "rgba(245, 240, 232, 0.5)",
            }}
          >
            Enter your account to join the game
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div
                className="rounded-lg border p-4 text-sm font-medium"
                style={{
                  background: "rgba(255, 59, 59, 0.1)",
                  borderColor: "rgba(255, 59, 59, 0.3)",
                  color: "#ff3b3b",
                }}
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium uppercase tracking-widest"
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  color: "rgba(245, 240, 232, 0.6)",
                  marginBottom: "8px",
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border px-4 py-3 text-sm transition-all focus:outline-none"
                style={{
                  background: "rgba(26, 26, 26, 0.5)",
                  borderColor: "rgba(245, 240, 232, 0.12)",
                  color: "#f5f0e8",
                }}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "#e8c84a";
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "rgba(245, 240, 232, 0.12)";
                }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium uppercase tracking-widest"
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  color: "rgba(245, 240, 232, 0.6)",
                  marginBottom: "8px",
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border px-4 py-3 text-sm transition-all focus:outline-none"
                style={{
                  background: "rgba(26, 26, 26, 0.5)",
                  borderColor: "rgba(245, 240, 232, 0.12)",
                  color: "#f5f0e8",
                }}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "#e8c84a";
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "rgba(245, 240, 232, 0.12)";
                }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all duration-200 hover:shadow-lg disabled:opacity-50"
              style={{
                fontFamily: "var(--font-bebas, serif)",
                background: loading ? "rgba(232, 200, 74, 0.5)" : "#e8c84a",
                color: "#080808",
                letterSpacing: "0.1em",
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (!loading) {
                  e.currentTarget.style.background = "#f06a2b";
                }
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (!loading) {
                  e.currentTarget.style.background = "#e8c84a";
                }
              }}
            >
              {loading ? "Signing In..." : "Sign In →"}
            </button>
          </form>

          <p
            className="mt-6 text-center text-sm"
            style={{
              color: "rgba(245, 240, 232, 0.5)",
            }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold transition-colors hover:opacity-80"
              style={{
                color: "#e8c84a",
              }}
            >
              Create one
            </Link>
          </p>
        </div>

        {/* Footer text */}
        <p
          className="mt-12 text-center text-xs uppercase tracking-widest"
          style={{
            fontFamily: "var(--font-mono, monospace)",
            color: "rgba(245, 240, 232, 0.3)",
          }}
        >
          Play · Compete · Win
        </p>
      </div>
    </main>
  );
}
