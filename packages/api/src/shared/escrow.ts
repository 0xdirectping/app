import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type PublicClient,
} from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { EscrowClient } from "@0xdirectping/sdk";

// Use looser types to avoid chain-specific type mismatches
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPublicClient = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyWalletClient = any;

let readClient: EscrowClient | null = null;
let writeClient: EscrowClient | null = null;
let publicClient: AnyPublicClient | null = null;

export function getPublicClient(rpcUrl: string): AnyPublicClient {
  if (!publicClient) {
    publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });
  }
  return publicClient;
}

export function getReadOnlyEscrow(rpcUrl: string): EscrowClient {
  if (!readClient) {
    // Create a minimal wallet client for read-only ops (EscrowClient requires one)
    const account = privateKeyToAccount(
      "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex,
    );
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(rpcUrl),
    });
    readClient = new EscrowClient({
      walletClient,
      publicClient: getPublicClient(rpcUrl),
    });
  }
  return readClient;
}

export function getWriteEscrow(walletKey: Hex, rpcUrl: string): EscrowClient {
  if (!writeClient) {
    const account = privateKeyToAccount(walletKey);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(rpcUrl),
    });
    writeClient = new EscrowClient({
      walletClient,
      publicClient: getPublicClient(rpcUrl),
    });
  }
  return writeClient;
}
