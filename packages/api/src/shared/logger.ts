import pino from "pino";
import { sanitizeLog } from "../config.js";

let logger: pino.Logger;

export function initLogger(level: string): pino.Logger {
  logger = pino({
    level,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    hooks: {
      logMethod(inputArgs, method) {
        // Sanitize all string arguments to prevent key leakage
        const sanitized = inputArgs.map((arg) =>
          typeof arg === "string" ? sanitizeLog(arg) : arg,
        );
        return method.apply(this, sanitized as Parameters<typeof method>);
      },
    },
  });
  return logger;
}

export function getLogger(): pino.Logger {
  if (!logger) {
    logger = pino({ level: "info" });
  }
  return logger;
}
