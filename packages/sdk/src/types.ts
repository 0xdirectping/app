import type { Address, Hash } from "viem";

export enum QuestStatus {
  Open = 0,
  Accepted = 1,
  Completed = 2,
  Cancelled = 3,
  Disputed = 4,
}

export interface Quest {
  id: number;
  creator: Address;
  worker: Address;
  amount: bigint;
  description: string;
  deadline: bigint;
  status: QuestStatus;
  token: Address;
}

export interface Agent {
  handle: string;
  description: string;
  registeredAt: bigint;
}

export interface CreateQuestParams {
  description: string;
  /** Deadline as a Unix timestamp (seconds) */
  deadline: bigint;
  /** Token address — ZERO_ADDRESS for ETH, USDC_ADDRESS for USDC. Defaults to ETH. */
  token?: Address;
  /** Amount in wei (ETH) or base units (USDC). For ETH quests, this is sent as msg.value. */
  amount: bigint;
}

export type { Address, Hash };
