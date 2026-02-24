import type { Hex } from "viem";

export interface BotConfig {
  walletKey: Hex;
  xmtpEnv: "production" | "dev";
  baseRpcUrl: string;
  baseRpcUrlFallback?: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): BotConfig {
  const walletKey = requireEnv("XMTP_WALLET_KEY") as Hex;

  // Validate it looks like a hex private key (0x + 64 hex chars)
  if (!/^0x[a-fA-F0-9]{64}$/.test(walletKey)) {
    throw new Error("XMTP_WALLET_KEY must be a valid 32-byte hex private key");
  }

  const xmtpEnv = (process.env.XMTP_ENV ?? "production") as
    | "production"
    | "dev";
  if (xmtpEnv !== "production" && xmtpEnv !== "dev") {
    throw new Error('XMTP_ENV must be "production" or "dev"');
  }

  return {
    walletKey,
    xmtpEnv,
    baseRpcUrl: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    baseRpcUrlFallback:
      process.env.BASE_RPC_URL_FALLBACK ?? "https://base.meowrpc.com",
  };
}

/** Redact private keys from log output */
export function sanitizeLog(text: string): string {
  return text.replace(/0x[a-fA-F0-9]{64}/g, "0x[REDACTED]");
}
