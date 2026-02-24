import { Router } from "express";
import type { ApiConfig } from "../config.js";
import { writeRateLimit } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import { createQuestSchema } from "./schemas.js";
import { createQuestHandler } from "./create-quest.js";
import { loadReplayGuard } from "./replay-guard.js";

export function x402Router(config: ApiConfig): Router {
  const router = Router();

  // Load persisted replay guard state
  loadReplayGuard();

  router.post(
    "/create-quest",
    writeRateLimit,
    validate(createQuestSchema),
    createQuestHandler(config),
  );

  return router;
}
