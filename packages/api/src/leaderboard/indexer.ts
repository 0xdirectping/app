import { formatEther, formatUnits, type Address } from "viem";
import { ZERO_ADDRESS, QuestStatus } from "@0xdirectping/sdk";
import { getReadOnlyEscrow } from "../shared/escrow.js";
import { getLogger } from "../shared/logger.js";

export interface LeaderboardEntry {
  rank: number;
  address: Address;
  handle: string;
  questsAccepted: number;
  questsCompleted: number;
  totalEarnedETH: string;
  totalEarnedUSDC: string;
  completionRate: number;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  lastUpdated: string;
  totalAgents: number;
}

let cachedData: LeaderboardData | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const REFRESH_TIMEOUT_MS = 30_000; // 30 seconds
const RPC_DELAY_MS = 100; // 100ms between quest fetches

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function refreshLeaderboard(rpcUrl: string, rpcUrlFallback?: string): Promise<LeaderboardData> {
  const logger = getLogger();
  logger.info("Refreshing leaderboard data...");

  const escrow = getReadOnlyEscrow(rpcUrl, rpcUrlFallback);

  const questCount = await escrow.getQuestCount();

  // Aggregate by worker address by iterating through all quests
  const workers = new Map<
    Address,
    {
      accepted: number;
      completed: number;
      earnedETH: bigint;
      earnedUSDC: bigint;
    }
  >();

  for (let i = 0; i < questCount; i++) {
    try {
      const quest = await escrow.getQuest(i);

      // Track accepted quests (status >= Accepted means someone accepted)
      if (
        quest.status === QuestStatus.Accepted ||
        quest.status === QuestStatus.Completed ||
        quest.status === QuestStatus.Disputed
      ) {
        const worker = quest.worker as Address;
        if (!workers.has(worker)) {
          workers.set(worker, {
            accepted: 0,
            completed: 0,
            earnedETH: 0n,
            earnedUSDC: 0n,
          });
        }
        const entry = workers.get(worker)!;
        entry.accepted++;

        // Track completed quests
        if (quest.status === QuestStatus.Completed) {
          entry.completed++;
          const isETH = quest.token === ZERO_ADDRESS;
          if (isETH) {
            entry.earnedETH += quest.amount;
          } else {
            entry.earnedUSDC += quest.amount;
          }
        }
      }
    } catch {
      // Skip individual quest errors
    }

    // Delay between RPC calls to avoid bursts
    if (i < questCount - 1) {
      await sleep(RPC_DELAY_MS);
    }
  }

  // Get agent handles and build entries
  const entries: LeaderboardEntry[] = [];
  let rank = 1;

  // Sort by completed descending
  const sorted = [...workers.entries()].sort(
    (a, b) => b[1].completed - a[1].completed,
  );

  for (const [address, stats] of sorted) {
    let handle = address.slice(0, 10) + "...";
    try {
      const agent = await escrow.getAgent(address);
      if (agent.handle) {
        handle = agent.handle;
      }
    } catch {
      // Not a registered agent, use truncated address
    }

    entries.push({
      rank: rank++,
      address,
      handle,
      questsAccepted: stats.accepted,
      questsCompleted: stats.completed,
      totalEarnedETH: formatEther(stats.earnedETH),
      totalEarnedUSDC: formatUnits(stats.earnedUSDC, 6),
      completionRate:
        stats.accepted > 0
          ? Math.round((stats.completed / stats.accepted) * 100)
          : 0,
    });
  }

  const agentCount = await escrow.getAgentCount();

  const data: LeaderboardData = {
    entries,
    lastUpdated: new Date().toISOString(),
    totalAgents: agentCount,
  };

  logger.info(
    `Leaderboard refreshed: ${entries.length} workers, ${agentCount} agents`,
  );
  return data;
}

export async function getLeaderboard(rpcUrl: string, rpcUrlFallback?: string): Promise<LeaderboardData> {
  const now = Date.now();
  if (cachedData && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedData;
  }

  const logger = getLogger();

  try {
    // Race the refresh against a timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Leaderboard refresh timed out")), REFRESH_TIMEOUT_MS);
    });

    const data = await Promise.race([
      refreshLeaderboard(rpcUrl, rpcUrlFallback),
      timeoutPromise,
    ]);

    cachedData = data;
    lastFetchTime = now;
    return cachedData;
  } catch (err) {
    logger.error({ err: String(err) }, "Failed to refresh leaderboard");
    // Return stale data if available, otherwise empty
    if (cachedData) return cachedData;
    return { entries: [], lastUpdated: new Date().toISOString(), totalAgents: 0 };
  }
}
