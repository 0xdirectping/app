import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { formatEther } from "viem";
import { QuestStatus } from "@0xdirectping/sdk";
import type { EscrowClient, Quest, Address } from "@0xdirectping/sdk";
import { isProcessed, markProcessed } from "./state.js";
import { matchSkill } from "./matcher.js";
import { sendResultWithRetry } from "./messenger.js";
import { skills } from "./skills/index.js";
import { sanitizeLog } from "./config.js";

// Use loose type to avoid chain-specific type mismatches (Base has deposit tx types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPublicClient = any;

const RPC_DELAY_MS = 300;
const MAX_ACCEPTS_PER_CYCLE = 1;
const MIN_GAS_BALANCE = 100000000000000n; // 0.0001 ETH
const MAX_RETRIES = 3;

const HEALTH_FILE = join(process.cwd(), "worker-health.json");

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === MAX_RETRIES) throw err;
      const delay = 1000 * Math.pow(2, attempt - 1);
      console.warn(
        `[loop] ${label} failed (attempt ${attempt}/${MAX_RETRIES}): ${sanitizeLog(msg)}. Retrying in ${delay}ms...`,
      );
      await sleep(delay);
    }
  }
  throw new Error("Unreachable");
}

function writeHealth() {
  try {
    writeFileSync(
      HEALTH_FILE,
      JSON.stringify({ lastPollAt: new Date().toISOString(), ok: true }),
    );
  } catch {
    // Non-fatal — best-effort health file
  }
}

export async function runPollCycle(
  escrow: EscrowClient,
  publicClient: AnyPublicClient,
  workerAddress: Address,
): Promise<void> {
  // Check gas balance
  const balance = await withRetry(
    () => publicClient.getBalance({ address: workerAddress }) as Promise<bigint>,
    "getBalance",
  );

  if (balance < MIN_GAS_BALANCE) {
    console.warn(
      `[loop] Low gas balance: ${formatEther(balance)} ETH. Skipping accepts.`,
    );
    return;
  }

  // Get quest count
  const questCount = await withRetry(
    () => escrow.getQuestCount(),
    "getQuestCount",
  );
  console.log(
    `[loop] Scanning ${questCount} quests (balance: ${formatEther(balance)} ETH)`,
  );

  let acceptedThisCycle = 0;

  // Quest IDs start at 1
  for (let id = 1; id <= questCount; id++) {
    if (acceptedThisCycle >= MAX_ACCEPTS_PER_CYCLE) break;
    if (isProcessed(id)) continue;

    await sleep(RPC_DELAY_MS);

    let quest: Quest;
    try {
      quest = await withRetry(() => escrow.getQuest(id), `getQuest(${id})`);
    } catch (err) {
      console.error(`[loop] Failed to fetch quest #${id}, skipping`);
      continue;
    }

    // Skip non-open quests
    if (quest.status !== QuestStatus.Open) {
      markProcessed(id);
      continue;
    }

    // Skip expired quests
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (quest.deadline > 0n && quest.deadline < now) {
      console.log(`[loop] Quest #${id} expired, skipping`);
      markProcessed(id);
      continue;
    }

    // Skip our own quests (can't be both creator and worker)
    if (quest.creator.toLowerCase() === workerAddress.toLowerCase()) {
      markProcessed(id);
      continue;
    }

    // Try to match a skill
    const skill = matchSkill(quest.description, skills);
    if (!skill) {
      console.log(
        `[loop] Quest #${id}: no matching skill for "${quest.description.slice(0, 60)}..."`,
      );
      markProcessed(id);
      continue;
    }

    console.log(
      `[loop] Quest #${id}: matched skill "${skill.name}" — accepting...`,
    );

    // Accept the quest on-chain
    try {
      const hash = await escrow.acceptQuest(id);
      console.log(`[loop] Quest #${id} accepted, tx: ${hash}`);
      await escrow.waitForTransaction(hash);
      console.log(`[loop] Quest #${id} accept confirmed`);
      acceptedThisCycle++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("revert") || msg.includes("already")) {
        console.log(
          `[loop] Quest #${id} accept reverted (likely already taken), skipping`,
        );
        markProcessed(id);
        continue;
      }
      console.error(`[loop] Quest #${id} accept failed: ${sanitizeLog(msg)}`);
      continue; // Don't mark processed — retry next cycle
    }

    // Execute the skill
    let result: string;
    try {
      result = await skill.execute({ publicClient, escrow });
      console.log(
        `[loop] Quest #${id}: skill "${skill.name}" produced ${result.length} chars`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[loop] Quest #${id}: skill "${skill.name}" failed: ${sanitizeLog(msg)}`,
      );
      result = `Error executing skill "${skill.name}": ${msg}\n\nPlease open a dispute if needed.`;
    }

    // Deliver result via XMTP
    const header = [
      `**Quest #${id} — Delivery from @scout-alpha**`,
      "",
      `Skill: ${skill.name}`,
      `Bounty: ${formatEther(quest.amount)} ETH`,
      "",
      "---",
      "",
    ].join("\n");

    await sendResultWithRetry(quest.creator, header + result);
    console.log(`[loop] Quest #${id}: result delivered to ${quest.creator}`);

    markProcessed(id);
  }
}

export function startPolling(
  escrow: EscrowClient,
  publicClient: AnyPublicClient,
  workerAddress: Address,
  intervalMs: number,
): void {
  // Import shuttingDown dynamically to avoid circular dependency
  let getShuttingDown: () => boolean;
  import("./index.js").then((mod) => {
    getShuttingDown = () => mod.shuttingDown;
  });

  console.log(`[loop] Starting poll loop (interval: ${intervalMs}ms)`);

  const poll = async () => {
    if (getShuttingDown?.()) {
      console.log("[loop] Shutdown requested, exiting poll loop");
      process.exit(0);
      return;
    }

    try {
      await runPollCycle(escrow, publicClient, workerAddress);
      writeHealth();
    } catch (err) {
      console.error(
        "[loop] Poll cycle error:",
        sanitizeLog(err instanceof Error ? err.message : String(err)),
      );
    }
  };

  // Run immediately, then on interval
  poll();
  setInterval(poll, intervalMs);
}
