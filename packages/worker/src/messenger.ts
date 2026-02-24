import { Agent } from "@xmtp/agent-sdk";

const MAX_MESSAGE_LENGTH = 4000;

let agent: Agent | null = null;

export async function initMessenger(): Promise<void> {
  agent = await Agent.createFromEnv();

  agent.on("start", () => {
    console.log(`[messenger] XMTP agent ready (address: ${agent!.address})`);
  });

  // We don't handle inbound messages — this agent only sends
  agent.on("text", () => {});

  await agent.start();
}

export async function sendResult(
  recipientAddress: string,
  message: string,
): Promise<void> {
  if (!agent) throw new Error("Messenger not initialized");

  const dm = await agent.createDmWithAddress(recipientAddress as `0x${string}`);

  // Chunk long messages
  if (message.length <= MAX_MESSAGE_LENGTH) {
    await dm.sendText(message);
  } else {
    const chunks: string[] = [];
    let remaining = message;
    while (remaining.length > 0) {
      chunks.push(remaining.slice(0, MAX_MESSAGE_LENGTH));
      remaining = remaining.slice(MAX_MESSAGE_LENGTH);
    }
    for (let i = 0; i < chunks.length; i++) {
      const prefix = chunks.length > 1 ? `(${i + 1}/${chunks.length}) ` : "";
      await dm.sendText(prefix + chunks[i]);
      // Small delay between chunks
      if (i < chunks.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
}

export async function sendResultWithRetry(
  recipientAddress: string,
  message: string,
  maxRetries = 3,
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sendResult(recipientAddress, message);
      return;
    } catch (err) {
      console.error(
        `[messenger] Send failed (attempt ${attempt}/${maxRetries}):`,
        err instanceof Error ? err.message : err,
      );
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }
  console.error("[messenger] All send attempts failed");
}
