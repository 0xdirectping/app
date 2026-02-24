import { http, fallback, type Transport } from "viem";

/**
 * Build a viem fallback transport with retry + timeout.
 * Primary and fallback URLs come from config; each leg retries 3x with backoff.
 */
export function createRpcTransport(
  primaryUrl: string,
  fallbackUrl?: string,
): Transport {
  const legs = [
    http(primaryUrl, { retryCount: 3, retryDelay: 1000, timeout: 10_000 }),
  ];

  if (fallbackUrl) {
    legs.push(
      http(fallbackUrl, { retryCount: 3, retryDelay: 1000, timeout: 10_000 }),
    );
  }

  return fallback(legs);
}
