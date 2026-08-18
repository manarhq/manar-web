export const CORRELATION_ID_HEADER = "x-correlation-id";

/**
 * Reads the correlation ID from an incoming request's `x-correlation-id`
 * header, generating a new one (UUID v4) if the header is absent or empty.
 * Establishes the convention every route handler should follow so traces
 * can eventually be joined with `manar-api` / `manar-ai` logs.
 */
export function getOrCreateCorrelationId(headers: Headers): string {
  const existing = headers.get(CORRELATION_ID_HEADER);
  return existing && existing.trim().length > 0 ? existing : crypto.randomUUID();
}
