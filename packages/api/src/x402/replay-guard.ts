import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getLogger } from "../shared/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, "..", "..", "api-used-txhashes.json");

interface PersistedState {
  usedTxHashes: string[];
}

const usedTxHashes = new Set<string>();

export function loadReplayGuard(): void {
  if (!existsSync(STATE_FILE)) return;
  try {
    const data = JSON.parse(
      readFileSync(STATE_FILE, "utf-8"),
    ) as PersistedState;
    for (const hash of data.usedTxHashes) {
      usedTxHashes.add(hash.toLowerCase());
    }
    getLogger().info(
      `Loaded ${usedTxHashes.size} used tx hashes from disk`,
    );
  } catch (err) {
    getLogger().warn({ err: String(err) }, "Failed to load replay guard state");
  }
}

function saveState(): void {
  const data: PersistedState = {
    usedTxHashes: Array.from(usedTxHashes),
  };
  try {
    writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    getLogger().error({ err: String(err) }, "Failed to save replay guard state");
  }
}

export function isReplayed(txHash: string): boolean {
  return usedTxHashes.has(txHash.toLowerCase());
}

export function markUsed(txHash: string): void {
  usedTxHashes.add(txHash.toLowerCase());
  saveState();
}
