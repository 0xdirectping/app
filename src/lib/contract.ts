import { formatEther, formatUnits } from "viem";

export const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}` || "0x0000000000000000000000000000000000000000";

export const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const ERC20_ABI = [
  {
    inputs: [{ internalType: "address", name: "spender", type: "address" }, { internalType: "uint256", name: "amount", type: "uint256" }],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }, { internalType: "address", name: "spender", type: "address" }],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function formatTokenAmount(amount: bigint, token: string): string {
  if (token === ZERO_ADDRESS) {
    return formatEther(amount);
  }
  // USDC = 6 decimals
  return formatUnits(amount, 6);
}

export function getTokenSymbol(token: string): string {
  if (token === ZERO_ADDRESS) return "ETH";
  if (token.toLowerCase() === USDC_ADDRESS.toLowerCase()) return "USDC";
  return "TOKEN";
}

export const ESCROW_ABI = [
  // --- Quest functions ---
  {
    inputs: [
      { internalType: "string", name: "_description", type: "string" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
      { internalType: "address", name: "_token", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
    ],
    name: "createQuest",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_questId", type: "uint256" }],
    name: "acceptQuest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_questId", type: "uint256" }],
    name: "completeQuest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_questId", type: "uint256" }],
    name: "cancelQuest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_questId", type: "uint256" }],
    name: "getQuest",
    outputs: [
      {
        components: [
          { internalType: "address", name: "creator", type: "address" },
          { internalType: "address", name: "worker", type: "address" },
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "string", name: "description", type: "string" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
          { internalType: "uint8", name: "status", type: "uint8" },
          { internalType: "address", name: "token", type: "address" },
        ],
        internalType: "struct SimpleEscrowV3.Quest",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "questCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // --- Dispute functions ---
  {
    inputs: [{ internalType: "uint256", name: "_questId", type: "uint256" }],
    name: "openDispute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_questId", type: "uint256" }, { internalType: "address", name: "_recipient", type: "address" }],
    name: "resolveDispute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- Deadline refund ---
  {
    inputs: [{ internalType: "uint256", name: "_questId", type: "uint256" }],
    name: "claimExpiredRefund",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- Agent registry ---
  {
    inputs: [{ internalType: "string", name: "_handle", type: "string" }, { internalType: "string", name: "_description", type: "string" }],
    name: "registerAgent",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_addr", type: "address" }],
    name: "getAgent",
    outputs: [
      {
        components: [
          { internalType: "string", name: "handle", type: "string" },
          { internalType: "string", name: "description", type: "string" },
          { internalType: "uint256", name: "registeredAt", type: "uint256" },
        ],
        internalType: "struct SimpleEscrowV3.Agent",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "agentCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "agentByIndex",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  // --- Fee functions ---
  {
    inputs: [],
    name: "withdrawFees",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_newBps", type: "uint256" }],
    name: "setFeeBps",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "accumulatedFeesETH",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "accumulatedFeesUSDC",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "platformFeeBps",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_FEE_BPS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "USDC",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  // --- Events ---
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "questId", type: "uint256" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "string", name: "description", type: "string" },
      { indexed: false, internalType: "uint256", name: "deadline", type: "uint256" },
      { indexed: false, internalType: "address", name: "token", type: "address" },
    ],
    name: "QuestCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "questId", type: "uint256" },
      { indexed: true, internalType: "address", name: "worker", type: "address" },
    ],
    name: "QuestAccepted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "questId", type: "uint256" },
      { indexed: true, internalType: "address", name: "worker", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "QuestCompleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "uint256", name: "questId", type: "uint256" }],
    name: "QuestCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "questId", type: "uint256" },
      { indexed: true, internalType: "address", name: "disputedBy", type: "address" },
    ],
    name: "QuestDisputed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "questId", type: "uint256" },
      { indexed: true, internalType: "address", name: "recipient", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "DisputeResolved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "questId", type: "uint256" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "ExpiredRefund",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "agentAddress", type: "address" },
      { indexed: false, internalType: "string", name: "handle", type: "string" },
    ],
    name: "AgentRegistered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "to", type: "address" },
      { indexed: false, internalType: "uint256", name: "ethAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "usdcAmount", type: "uint256" },
    ],
    name: "FeesWithdrawn",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "oldBps", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "newBps", type: "uint256" },
    ],
    name: "FeeUpdated",
    type: "event",
  },
] as const;

export const STATUS_LABELS = ["Open", "Accepted", "Completed", "Cancelled", "Disputed"] as const;
export type QuestStatus = 0 | 1 | 2 | 3 | 4;
