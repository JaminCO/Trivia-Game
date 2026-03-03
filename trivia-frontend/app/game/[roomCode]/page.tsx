type GamePageProps = {
  params: Promise<{ roomCode: string }>;
};

export default async function GamePage({ params }: GamePageProps) {
  const { roomCode } = await params;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6">
      <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm text-muted-foreground">Gameplay</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Game {roomCode}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Question flow, timer, and scoring UI will be implemented in Phase 4.
        </p>
      </section>
    </main>
  );
}
