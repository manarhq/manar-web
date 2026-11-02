const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** `Idempotency-Key` for a mutation (a fresh UUID per call), nothing for reads. */
export function idempotencyHeader(method?: string): Record<string, string> {
  return MUTATING.has((method ?? "GET").toUpperCase())
    ? { "Idempotency-Key": crypto.randomUUID() }
    : {};
}
