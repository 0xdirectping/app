import type { Hex } from "viem";

export interface WorkerConfig {
  walletKey: Hex;
  xmtpEnv: "production" | "dev";
  baseRpcUrl: string;
  baseRpcUrlFallback?: string;
  pollIntervalMs: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): WorkerConfig {
  const walletKey = requireEnv("WORKER_WALLET_KEY") as Hex;

  if (!/^0x[a-fA-F0-9]{64}$/.test(walletKey)) {
    throw new Error("WORKER_WALLET_KEY must be a valid 32-byte hex private key");
  }

  // XMTP agent-sdk reads XMTP_WALLET_KEY from env
  process.env.XMTP_WALLET_KEY = walletKey;

  const xmtpEnv = (process.env.XMTP_ENV ?? "production") as
    | "production"
    | "dev";
  if (xmtpEnv !== "production" && xmtpEnv !== "dev") {
    throw new Error('XMTP_ENV must be "production" or "dev"');
  }

  const pollIntervalMs = parseInt(
    process.env.POLL_INTERVAL_MS ?? "60000",
    10,
  );

  return {
    walletKey,
    xmtpEnv,
    baseRpcUrl: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    baseRpcUrlFallback:
      process.env.BASE_RPC_URL_FALLBACK ?? "https://base.meowrpc.com",
    pollIntervalMs,
  };
}

export function sanitizeLog(text: string): string {
  return text.replace(/0x[a-fA-F0-9]{64}/g, "0x[REDACTED]");
}
