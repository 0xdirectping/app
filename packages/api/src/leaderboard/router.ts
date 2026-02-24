import { Router } from "express";
import type { ApiConfig } from "../config.js";
import { readRateLimit } from "../middleware/rate-limit.js";
import { getLeaderboard } from "./indexer.js";

export function leaderboardRouter(config: ApiConfig): Router {
  const router = Router();

  router.get("/", readRateLimit, async (_req, res, next) => {
    try {
      const data = await getLeaderboard(config.baseRpcUrl);
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
