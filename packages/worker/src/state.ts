import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, "..", "worker-state.json");

interface PersistedState {
  processedQuests: number[];
}

const processedQuests = new Set<number>();

export function loadState(): void {
  if (!existsSync(STATE_FILE)) return;
  try {
    const data = JSON.parse(readFileSync(STATE_FILE, "utf-8")) as PersistedState;
    for (const id of data.processedQuests) {
      processedQuests.add(id);
    }
    console.log(`[state] Loaded ${processedQuests.size} processed quests from disk`);
  } catch (err) {
    console.warn("[state] Failed to load state file, starting fresh:", err);
  }
}

function saveState(): void {
  const data: PersistedState = {
    processedQuests: Array.from(processedQuests),
  };
  try {
    writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[state] Failed to save state:", err);
  }
}

export function isProcessed(questId: number): boolean {
  return processedQuests.has(questId);
}

export function markProcessed(questId: number): void {
  processedQuests.add(questId);
  saveState();
}
