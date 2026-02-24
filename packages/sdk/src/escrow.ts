import {
  createPublicClient,
  http,
} from "viem";
import { base } from "viem/chains";
import {
  ESCROW_ADDRESS,
  ESCROW_ABI,
  ERC20_ABI,
  USDC_ADDRESS,
  ZERO_ADDRESS,
  BASE_RPC_URL,
} from "./constants.js";
import { QuestStatus } from "./types.js";
import type { Quest, Agent, CreateQuestParams, Address, Hash } from "./types.js";

// Use looser types to avoid chain-specific type mismatches (Base has deposit tx types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPublicClient = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyWalletClient = any;

export interface EscrowClientOptions {
  walletClient: AnyWalletClient;
  publicClient?: AnyPublicClient;
}

export class EscrowClient {
  public readonly walletClient: AnyWalletClient;
  public readonly publicClient: AnyPublicClient;

  constructor(options: EscrowClientOptions) {
    this.walletClient = options.walletClient;
    this.publicClient =
      options.publicClient ??
      createPublicClient({ chain: base, transport: http(BASE_RPC_URL) });
  }

  private get account(): Address {
    const account = this.walletClient.account;
    if (!account) throw new Error("WalletClient must have an account");
    return account.address;
  }

  // ── Reads ──────────────────────────────────────────────────────────

  async getQuest(id: number): Promise<Quest> {
    const raw = await this.publicClient.readContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "getQuest",
      args: [BigInt(id)],
    });

    return {
      id,
      creator: raw.creator,
      worker: raw.worker,
      amount: raw.amount,
      description: raw.description,
      deadline: raw.deadline,
      status: raw.status as QuestStatus,
      token: raw.token,
    };
  }

  async getQuestCount(): Promise<number> {
    const count = await this.publicClient.readContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "questCount",
    });
    return Number(count);
  }

  async getAgent(address: Address): Promise<Agent> {
    const raw = await this.publicClient.readContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "getAgent",
      args: [address],
    });

    return {
      handle: raw.handle,
      description: raw.description,
      registeredAt: raw.registeredAt,
    };
  }

  async getAgentCount(): Promise<number> {
    const count = await this.publicClient.readContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "agentCount",
    });
    return Number(count);
  }

  async getAgentByIndex(index: number): Promise<Address> {
    const addr = await this.publicClient.readContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "agentByIndex",
      args: [BigInt(index)],
    });
    return addr;
  }

  async getFeeBps(): Promise<number> {
    const bps = await this.publicClient.readContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "platformFeeBps",
    });
    return Number(bps);
  }

  // ── Writes ─────────────────────────────────────────────────────────

  async createQuest(params: CreateQuestParams): Promise<Hash> {
    const token = params.token ?? ZERO_ADDRESS;
    const isETH = token === ZERO_ADDRESS;

    const hash = await this.walletClient.writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "createQuest",
      args: [params.description, params.deadline, token, params.amount],
      value: isETH ? params.amount : 0n,
      account: this.walletClient.account!,
      chain: base,
    });

    return hash;
  }

  async acceptQuest(id: number): Promise<Hash> {
    return this.walletClient.writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "acceptQuest",
      args: [BigInt(id)],
      account: this.walletClient.account!,
      chain: base,
    });
  }

  async completeQuest(id: number): Promise<Hash> {
    return this.walletClient.writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "completeQuest",
      args: [BigInt(id)],
      account: this.walletClient.account!,
      chain: base,
    });
  }

  async cancelQuest(id: number): Promise<Hash> {
    return this.walletClient.writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "cancelQuest",
      args: [BigInt(id)],
      account: this.walletClient.account!,
      chain: base,
    });
  }

  async openDispute(id: number): Promise<Hash> {
    return this.walletClient.writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "openDispute",
      args: [BigInt(id)],
      account: this.walletClient.account!,
      chain: base,
    });
  }

  async claimExpiredRefund(id: number): Promise<Hash> {
    return this.walletClient.writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "claimExpiredRefund",
      args: [BigInt(id)],
      account: this.walletClient.account!,
      chain: base,
    });
  }

  async registerAgent(handle: string, description: string): Promise<Hash> {
    return this.walletClient.writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "registerAgent",
      args: [handle, description],
      account: this.walletClient.account!,
      chain: base,
    });
  }

  // ── USDC Helpers ───────────────────────────────────────────────────

  async approveUSDC(amount: bigint): Promise<Hash> {
    return this.walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ESCROW_ADDRESS, amount],
      account: this.walletClient.account!,
      chain: base,
    });
  }

  async getUSDCAllowance(owner: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [owner, ESCROW_ADDRESS],
    });
  }

  async getUSDCBalance(owner: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [owner],
    });
  }

  // ── Event Watchers ─────────────────────────────────────────────────

  watchQuestCreated(
    callback: (log: {
      questId: bigint;
      creator: Address;
      amount: bigint;
      description: string;
      deadline: bigint;
      token: Address;
    }) => void,
  ): () => void {
    return this.publicClient.watchContractEvent({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      eventName: "QuestCreated",
      onLogs: (logs: any[]) => {
        for (const log of logs) {
          if (log.args?.questId !== undefined) {
            callback(log.args as Parameters<typeof callback>[0]);
          }
        }
      },
    });
  }

  watchQuestAccepted(
    callback: (log: { questId: bigint; worker: Address }) => void,
  ): () => void {
    return this.publicClient.watchContractEvent({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      eventName: "QuestAccepted",
      onLogs: (logs: any[]) => {
        for (const log of logs) {
          if (log.args?.questId !== undefined) {
            callback(log.args as Parameters<typeof callback>[0]);
          }
        }
      },
    });
  }

  watchQuestCompleted(
    callback: (log: {
      questId: bigint;
      worker: Address;
      amount: bigint;
    }) => void,
  ): () => void {
    return this.publicClient.watchContractEvent({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      eventName: "QuestCompleted",
      onLogs: (logs: any[]) => {
        for (const log of logs) {
          if (log.args?.questId !== undefined) {
            callback(log.args as Parameters<typeof callback>[0]);
          }
        }
      },
    });
  }

  // ── Tx Receipt Helper ─────────────────────────────────────────────

  async waitForTransaction(hash: Hash) {
    return this.publicClient.waitForTransactionReceipt({ hash });
  }
}
