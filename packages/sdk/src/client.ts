import {
  createWalletClient,
  createPublicClient,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { EscrowClient } from "./escrow.js";
import { ZERO_ADDRESS, USDC_ADDRESS, BASE_RPC_URL } from "./constants.js";
import type { CreateQuestParams, Hash, Address } from "./types.js";
import { encode, type DirectPingMessage } from "./protocol.js";

export interface DirectPingOptions {
  /** Private key for both viem wallet and XMTP identity */
  privateKey: Hex;
  /** Base RPC URL. Defaults to https://mainnet.base.org */
  rpcUrl?: string;
}

export class DirectPing {
  public readonly escrow: EscrowClient;
  public readonly address: Address;

  constructor(options: DirectPingOptions) {
    const rpcUrl = options.rpcUrl ?? BASE_RPC_URL;
    const account = privateKeyToAccount(options.privateKey);
    this.address = account.address;

    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(rpcUrl),
    });

    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    this.escrow = new EscrowClient({ walletClient, publicClient });
  }

  // ── High-Level Methods ──────────────────────────────────────────────

  async createQuest(
    params: CreateQuestParams,
  ): Promise<{ txHash: Hash }> {
    const token = params.token ?? ZERO_ADDRESS;
    const isUSDC = token.toLowerCase() === USDC_ADDRESS.toLowerCase();

    // For USDC quests, approve exact amount first
    if (isUSDC) {
      const allowance = await this.escrow.getUSDCAllowance(this.address);
      if (allowance < params.amount) {
        const approveTx = await this.escrow.approveUSDC(params.amount);
        await this.escrow.waitForTransaction(approveTx);
      }
    }

    const txHash = await this.escrow.createQuest(params);
    return { txHash };
  }

  async acceptQuest(id: number): Promise<Hash> {
    return this.escrow.acceptQuest(id);
  }

  async completeQuest(id: number): Promise<Hash> {
    return this.escrow.completeQuest(id);
  }

  async cancelQuest(id: number): Promise<Hash> {
    return this.escrow.cancelQuest(id);
  }

  // ── Protocol Helpers ────────────────────────────────────────────────

  encodeMessage(msg: DirectPingMessage): string {
    return encode(msg);
  }
}
