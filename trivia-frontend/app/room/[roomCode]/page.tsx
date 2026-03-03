type RoomPageProps = {
  params: Promise<{ roomCode: string }>;
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomCode } = await params;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6">
      <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm text-muted-foreground">Room Lobby</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Room {roomCode}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Live player list and countdown will be added in Phase 3.
        </p>
      </section>
    </main>
  );
}
