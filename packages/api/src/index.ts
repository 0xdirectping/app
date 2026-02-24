import express from "express";
import { loadConfig, sanitizeLog } from "./config.js";
import { initLogger, getLogger } from "./shared/logger.js";
import {
  helmetMiddleware,
  corsMiddleware,
  requestId,
  requestLogger,
} from "./middleware/security.js";
import { leaderboardRouter } from "./leaderboard/router.js";
import { mcpRouter } from "./mcp/transport.js";
import { x402Router } from "./x402/router.js";

const config = loadConfig();
const logger = initLogger(config.logLevel);

const app = express();

// Trust nginx proxy
app.set("trust proxy", 1);

// Security middleware
app.use(helmetMiddleware());
app.use(corsMiddleware(config.allowedOrigins));
app.use(requestId());
app.use(requestLogger(logger));

// Body parsing with size limit
app.use(express.json({ limit: "64kb" }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Mount routers
app.use("/api/leaderboard", leaderboardRouter(config));
app.use("/mcp", mcpRouter(config));
app.use("/x402", x402Router(config));

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error({ err: sanitizeLog(err.message), stack: sanitizeLog(err.stack ?? "") }, "Unhandled error");
    res.status(500).json({ error: "Internal server error" });
  },
);

// Bind to localhost only — never exposed to the internet directly
app.listen(config.port, "127.0.0.1", () => {
  logger.info(`API server listening on 127.0.0.1:${config.port}`);
});
