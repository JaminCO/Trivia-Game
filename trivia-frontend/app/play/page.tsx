import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6">
      <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm text-muted-foreground">Trivia Project</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Phase 0 Status</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          App Router scaffold is ready. Use these routes to validate Task 0.4.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link className="rounded-xl border px-4 py-3 hover:bg-muted" href="/login">
            /login
          </Link>
          <Link className="rounded-xl border px-4 py-3 hover:bg-muted" href="/dashboard">
            /dashboard
          </Link>
          <Link className="rounded-xl border px-4 py-3 hover:bg-muted" href="/room/demo-room">
            /room/[roomCode]
          </Link>
          <Link className="rounded-xl border px-4 py-3 hover:bg-muted" href="/game/demo-room">
            /game/[roomCode]
          </Link>
          <Link className="rounded-xl border px-4 py-3 hover:bg-muted" href="/results/demo-room">
            /results/[roomCode]
          </Link>
          <Link className="rounded-xl border px-4 py-3 hover:bg-muted" href="/admin">
            /admin
          </Link>
        </div>
      </section>
    </main>
  );
}
