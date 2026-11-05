/**
 * The newest time the whole chain was verified, from manar-api's `lastFullVerifiedAt` (added by
 * the api-core track; not in the generated schema until `pnpm api:codegen` picks it up). Absent
 * or null means the API has no full verification on record: say so, never imply one.
 */
export function lastFullVerifiedAt(data: unknown): string | null {
  const value = (data as { lastFullVerifiedAt?: unknown } | undefined)?.lastFullVerifiedAt;
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

export type FullCheck = "passed" | "failed" | "never";

/** manar-api's `fullCheck`; anything missing or unknown is "never": no full check on record. */
export function fullCheck(data: unknown): FullCheck {
  const v = (data as { fullCheck?: unknown } | undefined)?.fullCheck;
  return v === "passed" || v === "failed" ? v : "never";
}

/** What the badge may claim: "verified" only when the recent check is valid AND a full check passed. */
export function auditBadgeState(data: unknown): "verified" | "recent-only" | "broken" {
  const d = data as { valid?: unknown } | undefined;
  if (!d?.valid || fullCheck(data) === "failed") return "broken";
  return fullCheck(data) === "passed" ? "verified" : "recent-only";
}
