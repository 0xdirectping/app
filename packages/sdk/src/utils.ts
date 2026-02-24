import { formatEther, formatUnits } from "viem";
import { USDC_ADDRESS, ZERO_ADDRESS, STATUS_LABELS } from "./constants.js";
import { QuestStatus } from "./types.js";
import type { Quest, Address } from "./types.js";

export function formatTokenAmount(amount: bigint, token: Address): string {
  if (token === ZERO_ADDRESS) {
    return formatEther(amount);
  }
  // USDC = 6 decimals
  return formatUnits(amount, 6);
}

export function getTokenSymbol(token: Address): string {
  if (token === ZERO_ADDRESS) return "ETH";
  if (token.toLowerCase() === USDC_ADDRESS.toLowerCase()) return "USDC";
  return "TOKEN";
}

export function isETHQuest(quest: Quest): boolean {
  return quest.token === ZERO_ADDRESS;
}

export function isUSDCQuest(quest: Quest): boolean {
  return quest.token.toLowerCase() === USDC_ADDRESS.toLowerCase();
}

export function questStatusLabel(status: QuestStatus): string {
  return STATUS_LABELS[status] ?? "Unknown";
}
