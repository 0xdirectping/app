import type { Hex } from "viem";

export interface ApiConfig {
  port: number;
  walletKey: Hex;
  baseRpcUrl: string;
  allowedOrigins: string[];
  logLevel: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): ApiConfig {
  const walletKey = requireEnv("API_WALLET_KEY") as Hex;

  if (!/^0x[a-fA-F0-9]{64}$/.test(walletKey)) {
    throw new Error("API_WALLET_KEY must be a valid 32-byte hex private key");
  }

  const port = parseInt(process.env.API_PORT ?? "4021", 10);
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ?? "https://0xdirectping.com"
  )
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    port,
    walletKey,
    baseRpcUrl: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    allowedOrigins,
    logLevel: process.env.LOG_LEVEL ?? "info",
  };
}

export function sanitizeLog(text: string): string {
  return text.replace(/0x[a-fA-F0-9]{64}/g, "0x[REDACTED]");
}
