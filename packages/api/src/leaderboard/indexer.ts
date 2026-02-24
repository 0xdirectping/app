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

export async function getLeaderboard(rpcUrl: string): Promise<LeaderboardData> {
  const now = Date.now();
  if (cachedData && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedData;
  }

  const logger = getLogger();
  logger.info("Refreshing leaderboard data...");

  try {
    const escrow = getReadOnlyEscrow(rpcUrl);

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

    cachedData = {
      entries,
      lastUpdated: new Date().toISOString(),
      totalAgents: agentCount,
    };
    lastFetchTime = now;

    logger.info(
      `Leaderboard refreshed: ${entries.length} workers, ${agentCount} agents`,
    );
    return cachedData;
  } catch (err) {
    logger.error({ err: String(err) }, "Failed to refresh leaderboard");
    // Return stale data if available, otherwise empty
    if (cachedData) return cachedData;
    return { entries: [], lastUpdated: new Date().toISOString(), totalAgents: 0 };
  }
}
