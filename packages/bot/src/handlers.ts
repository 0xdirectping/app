import {
  type EscrowClient,
  decode,
  encode,
  QuestStatus,
  formatTokenAmount,
  getTokenSymbol,
  questStatusLabel,
  ZERO_ADDRESS,
  USDC_ADDRESS,
  type DirectPingMessage,
  type Address,
} from "@0xdirectping/sdk";
import { parseEther, parseUnits, formatEther } from "viem";

// ── Rate Limiting ────────────────────────────────────────────────────

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function isRateLimited(sender: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(sender) ?? [];

  // Remove entries outside window
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(sender, recent);
    return true;
  }

  recent.push(now);
  rateLimitMap.set(sender, recent);
  return false;
}

// ── Input Validation ─────────────────────────────────────────────────

const MAX_DESCRIPTION_LENGTH = 500;
const MIN_ETH_AMOUNT = parseEther("0.0001");
const MAX_ETH_AMOUNT = parseEther("100");
const MIN_USDC_AMOUNT = parseUnits("1", 6);
const MAX_USDC_AMOUNT = parseUnits("100000", 6);
const MIN_DEADLINE_DAYS = 1;
const MAX_DEADLINE_DAYS = 365;

function sanitizeDescription(desc: string): string | null {
  if (!desc || desc.length > MAX_DESCRIPTION_LENGTH) return null;
  // Strip control characters
  const clean = desc.replace(/[\x00-\x1f\x7f]/g, "");
  if (clean.length === 0) return null;
  return clean;
}

function validateQuestId(value: string, maxCount: number): number | null {
  const id = parseInt(value, 10);
  if (isNaN(id) || id < 0 || id >= maxCount || !Number.isInteger(id))
    return null;
  return id;
}

function parseToken(value: string): "ETH" | "USDC" | null {
  const upper = value.toUpperCase();
  if (upper === "ETH") return "ETH";
  if (upper === "USDC") return "USDC";
  return null;
}

function parseAmount(
  value: string,
  token: "ETH" | "USDC",
): bigint | null {
  try {
    const amount =
      token === "ETH" ? parseEther(value) : parseUnits(value, 6);

    if (token === "ETH") {
      if (amount < MIN_ETH_AMOUNT || amount > MAX_ETH_AMOUNT) return null;
    } else {
      if (amount < MIN_USDC_AMOUNT || amount > MAX_USDC_AMOUNT) return null;
    }

    return amount;
  } catch {
    return null;
  }
}

// ── Response Helpers ─────────────────────────────────────────────────

function okResponse(data: Record<string, unknown>): string {
  return encode({ type: "response", ok: true, data: data as any });
}

function errResponse(error: string): string {
  return encode({ type: "response", ok: false, error });
}

function textReply(text: string): string {
  return text;
}

// ── Slash Command Parser ─────────────────────────────────────────────

interface SlashCommand {
  name: string;
  args: string[];
}

function parseSlashCommand(text: string): SlashCommand | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;

  // Parse respecting quoted strings
  const parts: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inQuote) {
      if (ch === quoteChar) {
        inQuote = false;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === " ") {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);

  if (parts.length === 0) return null;

  return {
    name: parts[0].slice(1).toLowerCase(),
    args: parts.slice(1),
  };
}

// ── Main Handler ─────────────────────────────────────────────────────

export async function handleMessage(
  senderAddress: string,
  messageText: string,
  escrow: EscrowClient,
  botAddress: Address,
): Promise<string> {
  // Rate limiting
  if (isRateLimited(senderAddress)) {
    return textReply(
      "Rate limited. Please wait a moment before sending more commands.",
    );
  }

  // Try protocol message first
  const dpMsg = decode(messageText);
  if (dpMsg) {
    return handleProtocolMessage(senderAddress, dpMsg, escrow, botAddress);
  }

  // Try slash command
  const cmd = parseSlashCommand(messageText);
  if (cmd) {
    return handleSlashCommand(senderAddress, cmd, escrow, botAddress);
  }

  // Plain text — show help
  return textReply(
    "Welcome to 0xdirectping! Commands:\n" +
      "/help — Show this message\n" +
      "/quests — List open quests\n" +
      "/quest <id> — Show quest details\n" +
      '/create "<description>" <amount> <ETH|USDC> — Create a quest\n' +
      "/accept <id> — Accept a quest\n" +
      "/complete <id> — Complete a quest (release funds)\n" +
      "/cancel <id> — Cancel an open quest\n" +
      '/register <handle> "<description>" — Register as an agent\n' +
      "/status — Show bot wallet info",
  );
}

// ── Protocol Message Handler ─────────────────────────────────────────

async function handleProtocolMessage(
  senderAddress: string,
  msg: DirectPingMessage,
  escrow: EscrowClient,
  botAddress: Address,
): Promise<string> {
  try {
    switch (msg.type) {
      case "quest:create": {
        const desc = sanitizeDescription(msg.description);
        if (!desc) return errResponse("Invalid description (max 500 chars, no control chars)");

        const token = parseToken(msg.token);
        if (!token) return errResponse("Token must be ETH or USDC");

        const amount = parseAmount(msg.amount, token);
        if (!amount) return errResponse(`Invalid amount for ${token}`);

        if (msg.deadline < MIN_DEADLINE_DAYS || msg.deadline > MAX_DEADLINE_DAYS) {
          return errResponse(`Deadline must be ${MIN_DEADLINE_DAYS}-${MAX_DEADLINE_DAYS} days`);
        }

        const deadlineTimestamp = BigInt(
          Math.floor(Date.now() / 1000) + msg.deadline * 86400,
        );
        const tokenAddr = token === "ETH" ? ZERO_ADDRESS : USDC_ADDRESS;

        // Approve USDC if needed
        if (token === "USDC") {
          const allowance = await escrow.getUSDCAllowance(botAddress);
          if (allowance < amount) {
            const approveTx = await escrow.approveUSDC(amount);
            await escrow.waitForTransaction(approveTx);
          }
        }

        const txHash = await escrow.createQuest({
          description: desc,
          deadline: deadlineTimestamp,
          token: tokenAddr,
          amount,
        });

        return okResponse({ txHash, message: "Quest created" });
      }

      case "quest:accept": {
        const count = await escrow.getQuestCount();
        if (msg.questId < 0 || msg.questId >= count) {
          return errResponse("Invalid quest ID");
        }
        const txHash = await escrow.acceptQuest(msg.questId);
        return okResponse({ txHash, message: "Quest accepted" });
      }

      case "quest:complete": {
        const count = await escrow.getQuestCount();
        if (msg.questId < 0 || msg.questId >= count) {
          return errResponse("Invalid quest ID");
        }
        const quest = await escrow.getQuest(msg.questId);
        if (quest.creator.toLowerCase() !== botAddress.toLowerCase()) {
          return errResponse("Only the quest creator can complete it");
        }
        const txHash = await escrow.completeQuest(msg.questId);
        return okResponse({ txHash, message: "Quest completed, funds released" });
      }

      case "quest:cancel": {
        const count = await escrow.getQuestCount();
        if (msg.questId < 0 || msg.questId >= count) {
          return errResponse("Invalid quest ID");
        }
        const quest = await escrow.getQuest(msg.questId);
        if (quest.creator.toLowerCase() !== botAddress.toLowerCase()) {
          return errResponse("Only the quest creator can cancel it");
        }
        const txHash = await escrow.cancelQuest(msg.questId);
        return okResponse({ txHash, message: "Quest cancelled" });
      }

      case "quest:status": {
        const count = await escrow.getQuestCount();
        if (msg.questId < 0 || msg.questId >= count) {
          return errResponse("Invalid quest ID");
        }
        const quest = await escrow.getQuest(msg.questId);
        return okResponse({
          quest: {
            id: quest.id,
            creator: quest.creator,
            worker: quest.worker,
            amount: formatTokenAmount(quest.amount, quest.token),
            token: getTokenSymbol(quest.token),
            status: questStatusLabel(quest.status),
            deadline: Number(quest.deadline),
          },
        });
      }

      case "quest:list": {
        const count = await escrow.getQuestCount();
        const quests = [];
        const limit = Math.min(count, 20); // Cap at 20 to avoid huge responses
        for (let i = count - 1; i >= 0 && quests.length < limit; i--) {
          const q = await escrow.getQuest(i);
          if (msg.filter === "open" && q.status !== QuestStatus.Open) continue;
          if (msg.filter === "mine" && q.creator.toLowerCase() !== botAddress.toLowerCase()) continue;
          quests.push({
            id: q.id,
            description: q.description,
            amount: formatTokenAmount(q.amount, q.token),
            token: getTokenSymbol(q.token),
            status: questStatusLabel(q.status),
          });
        }
        return okResponse({ quests });
      }

      case "response":
        // We don't handle incoming responses
        return textReply("Acknowledged.");

      default:
        return errResponse("Unknown message type");
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    console.error(`[protocol:${msg.type}] Error:`, message);
    // Don't expose stack traces or internal details
    const safeMessage = message.includes("revert")
      ? message
      : "Transaction failed. Please check quest status and try again.";
    return errResponse(safeMessage);
  }
}

// ── Slash Command Handler ────────────────────────────────────────────

async function handleSlashCommand(
  senderAddress: string,
  cmd: SlashCommand,
  escrow: EscrowClient,
  botAddress: Address,
): Promise<string> {
  try {
    switch (cmd.name) {
      case "help":
        return textReply(
          "0xdirectping Bot Commands:\n\n" +
            "/quests — List open quests\n" +
            "/quest <id> — Show quest details\n" +
            '/create "<description>" <amount> <ETH|USDC> — Create a quest\n' +
            "/accept <id> — Accept a quest\n" +
            "/complete <id> — Complete a quest (release funds)\n" +
            "/cancel <id> — Cancel an open quest\n" +
            '/register <handle> "<description>" — Register as an agent\n' +
            "/status — Show bot wallet info",
        );

      case "quests": {
        const count = await escrow.getQuestCount();
        if (count === 0) return textReply("No quests found.");

        const lines: string[] = [];
        const limit = Math.min(count, 10);
        for (let i = count - 1; i >= 0 && lines.length < limit; i--) {
          const q = await escrow.getQuest(i);
          if (q.status !== QuestStatus.Open) continue;
          const amt = formatTokenAmount(q.amount, q.token);
          const sym = getTokenSymbol(q.token);
          lines.push(`#${q.id}: ${q.description.slice(0, 60)} — ${amt} ${sym}`);
        }

        if (lines.length === 0) return textReply("No open quests found.");
        return textReply("Open Quests:\n" + lines.join("\n"));
      }

      case "quest": {
        if (cmd.args.length < 1) return textReply("Usage: /quest <id>");
        const count = await escrow.getQuestCount();
        const id = validateQuestId(cmd.args[0], count);
        if (id === null) return textReply("Invalid quest ID.");

        const q = await escrow.getQuest(id);
        const amt = formatTokenAmount(q.amount, q.token);
        const sym = getTokenSymbol(q.token);
        const deadline = new Date(Number(q.deadline) * 1000).toISOString();

        return textReply(
          `Quest #${q.id}\n` +
            `Description: ${q.description}\n` +
            `Amount: ${amt} ${sym}\n` +
            `Status: ${questStatusLabel(q.status)}\n` +
            `Creator: ${q.creator}\n` +
            `Worker: ${q.worker === ZERO_ADDRESS ? "None" : q.worker}\n` +
            `Deadline: ${deadline}`,
        );
      }

      case "create": {
        // /create "description" amount TOKEN
        if (cmd.args.length < 3) {
          return textReply('Usage: /create "<description>" <amount> <ETH|USDC>');
        }

        const desc = sanitizeDescription(cmd.args[0]);
        if (!desc) return textReply("Invalid description (max 500 chars).");

        const token = parseToken(cmd.args[2]);
        if (!token) return textReply("Token must be ETH or USDC.");

        const amount = parseAmount(cmd.args[1], token);
        if (!amount) {
          return textReply(
            token === "ETH"
              ? "ETH amount must be between 0.0001 and 100."
              : "USDC amount must be between 1 and 100,000.",
          );
        }

        // Default deadline: 7 days
        const deadlineDays = cmd.args[3] ? parseInt(cmd.args[3], 10) : 7;
        if (deadlineDays < MIN_DEADLINE_DAYS || deadlineDays > MAX_DEADLINE_DAYS || isNaN(deadlineDays)) {
          return textReply(`Deadline must be ${MIN_DEADLINE_DAYS}-${MAX_DEADLINE_DAYS} days.`);
        }

        const deadlineTimestamp = BigInt(
          Math.floor(Date.now() / 1000) + deadlineDays * 86400,
        );
        const tokenAddr = token === "ETH" ? ZERO_ADDRESS : USDC_ADDRESS;

        if (token === "USDC") {
          const allowance = await escrow.getUSDCAllowance(botAddress);
          if (allowance < amount) {
            const approveTx = await escrow.approveUSDC(amount);
            await escrow.waitForTransaction(approveTx);
          }
        }

        const txHash = await escrow.createQuest({
          description: desc,
          deadline: deadlineTimestamp,
          token: tokenAddr,
          amount,
        });
        const receipt = await escrow.waitForTransaction(txHash);

        return textReply(
          `Quest created! Tx: ${receipt.transactionHash}`,
        );
      }

      case "accept": {
        if (cmd.args.length < 1) return textReply("Usage: /accept <id>");
        const count = await escrow.getQuestCount();
        const id = validateQuestId(cmd.args[0], count);
        if (id === null) return textReply("Invalid quest ID.");

        const txHash = await escrow.acceptQuest(id);
        const receipt = await escrow.waitForTransaction(txHash);
        return textReply(`Quest #${id} accepted! Tx: ${receipt.transactionHash}`);
      }

      case "complete": {
        if (cmd.args.length < 1) return textReply("Usage: /complete <id>");
        const count = await escrow.getQuestCount();
        const id = validateQuestId(cmd.args[0], count);
        if (id === null) return textReply("Invalid quest ID.");

        const quest = await escrow.getQuest(id);
        if (quest.creator.toLowerCase() !== botAddress.toLowerCase()) {
          return textReply("Only the quest creator can complete it.");
        }

        const txHash = await escrow.completeQuest(id);
        const receipt = await escrow.waitForTransaction(txHash);
        return textReply(`Quest #${id} completed! Funds released. Tx: ${receipt.transactionHash}`);
      }

      case "cancel": {
        if (cmd.args.length < 1) return textReply("Usage: /cancel <id>");
        const count = await escrow.getQuestCount();
        const id = validateQuestId(cmd.args[0], count);
        if (id === null) return textReply("Invalid quest ID.");

        const quest = await escrow.getQuest(id);
        if (quest.creator.toLowerCase() !== botAddress.toLowerCase()) {
          return textReply("Only the quest creator can cancel it.");
        }

        const txHash = await escrow.cancelQuest(id);
        const receipt = await escrow.waitForTransaction(txHash);
        return textReply(`Quest #${id} cancelled. Tx: ${receipt.transactionHash}`);
      }

      case "register": {
        if (cmd.args.length < 2) {
          return textReply('Usage: /register <handle> "<description>"');
        }
        const handle = cmd.args[0];
        if (!handle || handle.length > 32) {
          return textReply("Handle must be 1-32 characters.");
        }
        const agentDesc = sanitizeDescription(cmd.args.slice(1).join(" "));
        if (!agentDesc) return textReply("Invalid description.");

        const txHash = await escrow.registerAgent(handle, agentDesc);
        const receipt = await escrow.waitForTransaction(txHash);
        return textReply(`Agent registered! Tx: ${receipt.transactionHash}`);
      }

      case "status": {
        const balance = await escrow.publicClient.getBalance({
          address: botAddress,
        });
        const usdcBalance = await escrow.getUSDCBalance(botAddress);
        const questCount = await escrow.getQuestCount();
        const agentCount = await escrow.getAgentCount();

        return textReply(
          `Bot Status\n` +
            `Address: ${botAddress}\n` +
            `ETH Balance: ${formatEther(balance)}\n` +
            `USDC Balance: ${formatTokenAmount(usdcBalance, USDC_ADDRESS)}\n` +
            `Total Quests: ${questCount}\n` +
            `Registered Agents: ${agentCount}`,
        );
      }

      default:
        return textReply(
          `Unknown command: /${cmd.name}. Send /help for available commands.`,
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[slash:${cmd.name}] Error:`, message);
    const safeMessage = message.includes("revert")
      ? `Transaction reverted: ${message}`
      : "Something went wrong. Please try again.";
    return textReply(safeMessage);
  }
}
