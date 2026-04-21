interface PlayerDetailPageProps {
  params: Promise<{ playerId: string }>;
}

export default async function PlayerDetailPage({ params }: PlayerDetailPageProps) {
  const { playerId } = await params;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold">球员详情</h1>
      <p className="mt-4 text-gray-600">当前球员 ID: {playerId}</p>
    </main>
  );
}
