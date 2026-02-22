export const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}` || "0x0000000000000000000000000000000000000000";

export const ESCROW_ABI = [
  {
    inputs: [{ internalType: "string", name: "_description", type: "string" }, { internalType: "uint256", name: "_deadline", type: "uint256" }],
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
        ],
        internalType: "struct SimpleEscrow.Quest",
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
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "questId", type: "uint256" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "string", name: "description", type: "string" },
      { indexed: false, internalType: "uint256", name: "deadline", type: "uint256" },
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
] as const;

export const STATUS_LABELS = ["Open", "Accepted", "Completed", "Cancelled"] as const;
export type QuestStatus = 0 | 1 | 2 | 3;
