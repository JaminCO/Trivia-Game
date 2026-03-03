type ResultsPageProps = {
  params: Promise<{ roomCode: string }>;
};

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { roomCode } = await params;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6">
      <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm text-muted-foreground">Results</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Results {roomCode}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Final scores and post-game breakdown will be implemented in Phase 4.
        </p>
      </section>
    </main>
  );
}
