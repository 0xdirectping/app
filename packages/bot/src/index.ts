import { Agent } from "@xmtp/agent-sdk";
import { createWalletClient, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { EscrowClient } from "@0xdirectping/sdk";
import { loadConfig, sanitizeLog } from "./config.js";
import { handleMessage } from "./handlers.js";
import { createRpcTransport } from "./rpc.js";

async function main() {
  const config = loadConfig();
  console.log("Starting 0xdirectping bot...");

  // Set up viem clients for on-chain interaction
  const account = privateKeyToAccount(config.walletKey);

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
  const botAddress = account.address;

  // Set up XMTP agent
  const agent = await Agent.createFromEnv();

  agent.on("text", async (ctx) => {
    try {
      const messageText =
        typeof ctx.message.content === "string"
          ? ctx.message.content
          : String(ctx.message.content ?? "");

      // Get sender address — try common SDK property paths
      const senderAddress: string =
        (ctx.message as any).senderAddress ??
        (ctx.message as any).sender?.address ??
        (ctx.message as any).senderInboxId ??
        "unknown";

      const reply = await handleMessage(
        senderAddress,
        messageText,
        escrow,
        botAddress,
      );

      await ctx.conversation.sendText(reply);
    } catch (err) {
      console.error(
        "Error handling message:",
        sanitizeLog(err instanceof Error ? err.message : String(err)),
      );
      try {
        await ctx.conversation.sendText(
          "An internal error occurred. Please try again later.",
        );
      } catch {
        // Ignore send errors
      }
    }
  });

  agent.on("start", () => {
    console.log("0xdirectping bot is running");
    console.log(`Bot address: ${botAddress}`);
    console.log(`XMTP agent address: ${agent.address}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log("[bot] Shutting down...");
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  await agent.start();
}

main().catch((err) => {
  console.error(
    "Fatal error:",
    sanitizeLog(err instanceof Error ? err.message : String(err)),
  );
  process.exit(1);
});
