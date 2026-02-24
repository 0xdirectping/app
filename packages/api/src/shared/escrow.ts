import {
  createPublicClient,
  createWalletClient,
  type Hex,
  type PublicClient,
} from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { EscrowClient } from "@0xdirectping/sdk";
import { createRpcTransport } from "./rpc.js";

// Use looser types to avoid chain-specific type mismatches
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPublicClient = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyWalletClient = any;

let readClient: EscrowClient | null = null;
let writeClient: EscrowClient | null = null;
let publicClient: AnyPublicClient | null = null;

export function getPublicClient(
  rpcUrl: string,
  rpcUrlFallback?: string,
): AnyPublicClient {
  if (!publicClient) {
    publicClient = createPublicClient({
      chain: base,
      transport: createRpcTransport(rpcUrl, rpcUrlFallback),
    });
  }
  return publicClient;
}

export function getReadOnlyEscrow(
  rpcUrl: string,
  rpcUrlFallback?: string,
): EscrowClient {
  if (!readClient) {
    // Create a minimal wallet client for read-only ops (EscrowClient requires one)
    const account = privateKeyToAccount(
      "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex,
    );
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: createRpcTransport(rpcUrl, rpcUrlFallback),
    });
    readClient = new EscrowClient({
      walletClient,
      publicClient: getPublicClient(rpcUrl, rpcUrlFallback),
    });
  }
  return readClient;
}

export function getWriteEscrow(
  walletKey: Hex,
  rpcUrl: string,
  rpcUrlFallback?: string,
): EscrowClient {
  if (!writeClient) {
    const account = privateKeyToAccount(walletKey);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: createRpcTransport(rpcUrl, rpcUrlFallback),
    });
    writeClient = new EscrowClient({
      walletClient,
      publicClient: getPublicClient(rpcUrl, rpcUrlFallback),
    });
  }
  return writeClient;
}
