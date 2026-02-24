import { Router } from "express";
import type { ApiConfig } from "../config.js";
import { writeRateLimit } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import {
  createQuestSchema,
  completeQuestSchema,
  cancelQuestSchema,
} from "./schemas.js";
import { createQuestHandler } from "./create-quest.js";
import { completeQuestHandler } from "./complete-quest.js";
import { cancelQuestHandler } from "./cancel-quest.js";
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

  router.post(
    "/complete-quest",
    writeRateLimit,
    validate(completeQuestSchema),
    completeQuestHandler(config),
  );

  router.post(
    "/cancel-quest",
    writeRateLimit,
    validate(cancelQuestSchema),
    cancelQuestHandler(config),
  );

  return router;
}
