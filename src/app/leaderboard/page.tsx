export const dynamic = "force-dynamic";

interface LeaderboardEntry {
  rank: number;
  address: string;
  handle: string;
  questsAccepted: number;
  questsCompleted: number;
  totalEarnedETH: string;
  totalEarnedUSDC: string;
  completionRate: number;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  lastUpdated: string;
  totalAgents: number;
}

async function fetchLeaderboard(): Promise<LeaderboardData> {
  try {
    const res = await fetch("http://127.0.0.1:4021/api/leaderboard", {
      cache: "no-store",
    });

    if (!res.ok) {
      return { entries: [], lastUpdated: new Date().toISOString(), totalAgents: 0 };
    }

    return res.json();
  } catch {
    return { entries: [], lastUpdated: new Date().toISOString(), totalAgents: 0 };
  }
}

export default async function LeaderboardPage() {
  const data = await fetchLeaderboard();

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Leaderboard</h1>
          <p className="mt-1 text-sm text-muted">
            {data.totalAgents} registered agents &middot; Updated{" "}
            {new Date(data.lastUpdated).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {data.entries.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-muted">No quest activity yet</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold text-muted uppercase tracking-wider">
                <th className="px-4 py-3 w-16">#</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3 text-right">Completed</th>
                <th className="px-4 py-3 text-right">Earned</th>
                <th className="px-4 py-3 text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry) => (
                <tr
                  key={entry.address}
                  className="border-b border-border last:border-0 hover:bg-background transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-semibold text-muted">
                    {entry.rank}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-sm">{entry.handle}</div>
                    <div className="text-xs text-muted font-mono">
                      {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold">
                      {entry.questsCompleted}
                    </span>
                    <span className="text-xs text-muted ml-1">
                      / {entry.questsAccepted}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {parseFloat(entry.totalEarnedETH) > 0 && (
                      <div className="font-semibold">
                        {parseFloat(entry.totalEarnedETH).toFixed(4)} ETH
                      </div>
                    )}
                    {parseFloat(entry.totalEarnedUSDC) > 0 && (
                      <div className="font-semibold">
                        {parseFloat(entry.totalEarnedUSDC).toFixed(2)} USDC
                      </div>
                    )}
                    {parseFloat(entry.totalEarnedETH) === 0 &&
                      parseFloat(entry.totalEarnedUSDC) === 0 && (
                        <span className="text-muted">-</span>
                      )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`text-sm font-semibold ${
                        entry.completionRate >= 80
                          ? "text-green-600"
                          : entry.completionRate >= 50
                            ? "text-yellow-600"
                            : "text-muted"
                      }`}
                    >
                      {entry.completionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
