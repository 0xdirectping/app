const DP_PREFIX = "DP:";

// ── Message Types ────────────────────────────────────────────────────

export type DirectPingMessage =
  | {
      type: "quest:create";
      description: string;
      token: "ETH" | "USDC";
      amount: string;
      deadline: number;
    }
  | { type: "quest:accept"; questId: number }
  | { type: "quest:complete"; questId: number }
  | { type: "quest:cancel"; questId: number }
  | { type: "quest:status"; questId: number }
  | { type: "quest:list"; filter?: "open" | "mine" }
  | { type: "response"; ok: boolean; data?: ResponseData; error?: string };

export type ResponseData =
  | { questId: number; txHash: string }
  | { quests: Array<{ id: number; description: string; amount: string; token: string; status: string }> }
  | { quest: { id: number; creator: string; worker: string; amount: string; token: string; status: string; deadline: number } }
  | { txHash: string }
  | { message: string };

const KNOWN_TYPES = new Set([
  "quest:create",
  "quest:accept",
  "quest:complete",
  "quest:cancel",
  "quest:status",
  "quest:list",
  "response",
]);

// ── Encode / Decode ──────────────────────────────────────────────────

export function encode(msg: DirectPingMessage): string {
  return DP_PREFIX + JSON.stringify(msg);
}

export function decode(text: string): DirectPingMessage | null {
  if (!text.startsWith(DP_PREFIX)) return null;

  try {
    const parsed = JSON.parse(text.slice(DP_PREFIX.length));

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.type !== "string" ||
      !KNOWN_TYPES.has(parsed.type)
    ) {
      return null;
    }

    return parsed as DirectPingMessage;
  } catch {
    return null;
  }
}

export function isDirectPingMessage(text: string): boolean {
  return text.startsWith(DP_PREFIX);
}
