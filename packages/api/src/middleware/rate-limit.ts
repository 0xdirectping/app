import type { Request, Response, NextFunction } from "express";

interface RateLimitBucket {
  timestamps: number[];
}

const buckets = new Map<string, RateLimitBucket>();

// Clean up stale buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < 120_000);
    if (bucket.timestamps.length === 0) {
      buckets.delete(key);
    }
  }
}, 300_000);

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const key = `${ip}:${maxRequests}:${windowMs}`;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      buckets.set(key, bucket);
    }

    // Sliding window: keep only timestamps within the window
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

    if (bucket.timestamps.length >= maxRequests) {
      const retryAfter = Math.ceil(
        (bucket.timestamps[0]! + windowMs - now) / 1000,
      );
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "Too many requests", retryAfter });
      return;
    }

    bucket.timestamps.push(now);
    next();
  };
}

// Pre-configured rate limiters
export const readRateLimit = rateLimit(60, 60_000); // 60 req/min
export const writeRateLimit = rateLimit(10, 60_000); // 10 req/min
