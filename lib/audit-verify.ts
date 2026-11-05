import type { components } from "@/lib/api/schema";

/**
 * `GET /audit/verify` as manar-api now returns it. `lastFullVerifiedAt` and `fullCheck` (api#52)
 * are not in the generated schema until `pnpm api:codegen` picks them up; this type carries them
 * meanwhile. Optional on purpose: an API without them is treated as "never fully verified".
 */
export type FullCheck = "passed" | "failed" | "error" | "stale" | "never";

/**
 * Fields agreed with the api-core track (api#52, still moving; confirm names against its head):
 * `valid` is true only when a full check passed and is fresh; `fullCheck` says which state the full
 * check is in; `lastFullVerifiedAt` is the last passed full check; `coveredFrom` is where the
 * incremental check starts when only that ran. All are optional so an older API reads as
 * "never fully verified", never as verified.
 */
export type AuditVerifyResult = components["schemas"]["AuditVerifyDto"] & {
  lastFullVerifiedAt?: string | null;
  fullCheck?: FullCheck;
  coveredFrom?: string | null;
};

const validDate = (v: unknown): string | null =>
  typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : null;

/** The newest time the whole chain was verified; null means no full verification on record. */
export function lastFullVerifiedAt(data: AuditVerifyResult | undefined): string | null {
  return validDate(data?.lastFullVerifiedAt);
}

/** Where incremental coverage starts, when only the incremental check ran. */
export function coveredFrom(data: AuditVerifyResult | undefined): string | null {
  return validDate(data?.coveredFrom);
}

export function fullCheck(data: AuditVerifyResult | undefined): FullCheck {
  const v = data?.fullCheck;
  return v === "passed" || v === "failed" || v === "error" || v === "stale" ? v : "never";
}

/**
 * What the badge and the Verify button may claim.
 * - verified: valid AND the full check passed (the API only sets valid when that is fresh).
 * - broken: the full check failed or errored, or the walk named a broken event.
 * - recent-only: anything else (pending, partial, never, stale, or an API that predates fullCheck):
 *   recent events verified, full check pending. Never "verified".
 */
export function auditBadgeState(
  data: AuditVerifyResult | undefined,
): "verified" | "recent-only" | "broken" {
  if (!data) return "broken";
  const full = fullCheck(data);
  if (full === "failed" || full === "error" || data.brokenAt) return "broken";
  return data.valid && full === "passed" ? "verified" : "recent-only";
}
