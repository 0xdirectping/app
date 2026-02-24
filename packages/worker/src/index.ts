import { createWalletClient, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { EscrowClient } from "@0xdirectping/sdk";
import { loadConfig, sanitizeLog } from "./config.js";
import { loadState } from "./state.js";
import { initMessenger } from "./messenger.js";
import { startPolling } from "./loop.js";
import { skills } from "./skills/index.js";
import { createRpcTransport } from "./rpc.js";

export let shuttingDown = false;

async function main() {
  const config = loadConfig();
  console.log("Starting 0xdirectping worker agent...");
  console.log(`Skills loaded: ${skills.map((s) => s.name).join(", ")}`);

  // Load persisted state
  loadState();

  // Set up viem clients
  const account = privateKeyToAccount(config.walletKey);
  console.log(`Worker address: ${account.address}`);

  const transport = createRpcTransport(
    config.baseRpcUrl,
    config.baseRpcUrlFallback,
  );

  const walletClient = createWalletClient({
    account,
    chain: base,
    transport,
  });

  const publicClient = createPublicClient({
    chain: base,
    transport,
  });

  const escrow = new EscrowClient({ walletClient, publicClient });

  // Initialize XMTP messenger for outbound DMs
  console.log("Initializing XMTP messenger...");
  await initMessenger();

  // Graceful shutdown
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("[worker] Shutting down gracefully, finishing current poll...");
    // The poll loop checks `shuttingDown` before starting a new cycle.
    // Give it time to finish, then force exit as safety net.
    setTimeout(() => {
      console.log("[worker] Forced exit after 10s timeout");
      process.exit(0);
    }, 10_000).unref();
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // Start the poll loop
  startPolling(escrow, publicClient, account.address, config.pollIntervalMs);
}

main().catch((err) => {
  console.error(
    "Fatal error:",
    sanitizeLog(err instanceof Error ? err.message : String(err)),
  );
  process.exit(1);
});
