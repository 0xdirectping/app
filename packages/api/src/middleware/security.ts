import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import type { Logger } from "pino";

export function helmetMiddleware() {
  return helmet();
}

export function corsMiddleware(allowedOrigins: string[]) {
  return cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type"],
    maxAge: 86400,
  });
}

export function requestId() {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.headers["x-request-id"] =
      (req.headers["x-request-id"] as string) || randomUUID();
    next();
  };
}

export function requestLogger(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on("finish", () => {
      logger.info({
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: Date.now() - start,
        ip: req.ip,
        requestId: req.headers["x-request-id"],
      });
    });
    next();
  };
}
