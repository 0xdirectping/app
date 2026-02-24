export default function LeaderboardLoading() {
  return (
    <div className="py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black">Leaderboard</h1>
        <p className="mt-1 text-sm text-muted">Loading...</p>
      </div>
      <div className="card p-12 text-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  );
}
