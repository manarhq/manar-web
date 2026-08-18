import winston from "winston";

import { env } from "@/lib/env";

/**
 * Base structured (JSON) logger.
 *
 * There is no real server-side business logic yet, so this is intentionally
 * minimal: one JSON-formatted logger, used via `withCorrelationId()` so every
 * log line carries a `correlationId` field. Phase 9 (OCSF mapping,
 * operational vs. security-relevant channels) builds on this convention
 * rather than replacing it.
 */
export const logger = winston.createLogger({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: "manar-web" },
  transports: [new winston.transports.Console()],
});

/**
 * Returns a child logger that stamps every log line with the given
 * correlation ID, so logs for a single request/trace can be joined.
 */
export function withCorrelationId(correlationId: string): winston.Logger {
  return logger.child({ correlationId });
}
