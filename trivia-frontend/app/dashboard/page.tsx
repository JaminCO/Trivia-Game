"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { matchmakingAPI } from "@/lib/api";

const CATEGORIES = ["Science", "History", "Sports", "Entertainment", "Geography"];

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  // Redirect to login if not authenticated
  if (!loading && !user) {
    router.push("/login");
    return null;
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-4">
        <p>Loading...</p>
      </main>
    );
  }

  const handleJoinGame = async () => {
    if (!selectedCategory) {
      setError("Please select a category");
      return;
    }

    setError("");
    setJoining(true);

    try {
      const result = await matchmakingAPI.join(selectedCategory);
      router.push(`/room/${result.room_id}`);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to join game. Please try again."
      );
    } finally {
      setJoining(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Welcome, {user?.username}!</p>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
        >
          Logout
        </button>
      </header>

      <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold">Select a Category</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a category to start playing trivia
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);
                setError("");
              }}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                selectedCategory === category
                  ? "border-blue-500 bg-blue-50"
                  : "hover:bg-muted"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <button
          onClick={handleJoinGame}
          disabled={joining || !selectedCategory}
          className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {joining ? "Joining..." : "Join Game"}
        </button>
      </section>

      <section className="mt-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold">Quick Links</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin"
            className="rounded-xl border px-4 py-3 hover:bg-muted"
          >
            Admin Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
