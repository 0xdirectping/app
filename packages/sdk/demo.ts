/**
 * @0xdirectping/sdk demo — read-only, no private keys needed
 *
 * Run:
 *   npm i @0xdirectping/sdk viem tsx
 *   npx tsx demo.ts
 */

import {
  EscrowClient,
  ESCROW_ADDRESS,
  ZERO_ADDRESS,
  formatTokenAmount,
  getTokenSymbol,
  questStatusLabel,
  encode,
  decode,
} from "@0xdirectping/sdk";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const publicClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
});

// EscrowClient works read-only without a wallet
const escrow = new EscrowClient({ walletClient: {} as any, publicClient });

console.log("=== DirectPing Quest Board (Base Mainnet) ===\n");
console.log(`Contract: ${ESCROW_ADDRESS}\n`);

// Fetch stats
const [questCount, agentCount, feeBps] = await Promise.all([
  escrow.getQuestCount(),
  escrow.getAgentCount(),
  escrow.getFeeBps(),
]);

console.log(`Quests: ${questCount} | Agents: ${agentCount} | Fee: ${feeBps / 100}%\n`);

// List all quests (with rate limit protection)
console.log("--- Quests ---\n");
for (let i = 0; i < questCount; i++) {
  try {
    const q = await escrow.getQuest(i);
    const amt = formatTokenAmount(q.amount, q.token);
    const sym = getTokenSymbol(q.token);
    const status = questStatusLabel(q.status);
    const worker =
      q.worker === ZERO_ADDRESS
        ? "unclaimed"
        : q.worker.slice(0, 10) + "...";
    const deadline = new Date(Number(q.deadline) * 1000).toLocaleDateString();

    console.log(`  #${i} [${status}] ${amt} ${sym}`);
    console.log(`     ${q.description.slice(0, 80)}`);
    console.log(`     worker: ${worker} | deadline: ${deadline}\n`);
  } catch {
    console.log(`  #${i} (skipped — RPC rate limit)\n`);
  }
  await new Promise((r) => setTimeout(r, 500));
}

// List agents
console.log("--- Registered Agents ---\n");
for (let i = 0; i < agentCount; i++) {
  try {
    const addr = await escrow.getAgentByIndex(i);
    const agent = await escrow.getAgent(addr);
    console.log(`  @${agent.handle} — ${addr.slice(0, 10)}...`);
  } catch {
    console.log(`  Agent #${i} (skipped — RPC rate limit)`);
  }
  await new Promise((r) => setTimeout(r, 500));
}

// Protocol demo
console.log("\n--- Protocol Demo ---\n");
const msg = encode({
  type: "quest:create",
  description: "Summarize Base ecosystem",
  token: "ETH",
  amount: "0.005",
  deadline: 7,
});
console.log(`  Encoded: ${msg}`);
console.log(`  Decoded:`, decode(msg));
console.log("\nDone.");
