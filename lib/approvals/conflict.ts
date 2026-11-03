import { BffError } from "@/lib/api/raw";

/**
 * Why an approval action did not go through, as a key under `approvals.conflict` (E-021). Every
 * reason manar-api sends maps to its own sentence; anything else is the generic failure, never
 * "already decided".
 */
export type ConflictKey =
  | "paused"
  | "already_decided"
  | "expired"
  | "revoked"
  | "not_approved"
  | "action_already_used"
  | "not_signaled"
  | "forbidden"
  | "reauth"
  | "failed";

const KNOWN = new Set<ConflictKey>([
  "paused",
  "already_decided",
  "expired",
  "revoked",
  "not_approved",
  "action_already_used",
  "not_signaled",
]);

export function conflictKey(error: unknown): ConflictKey {
  if (error instanceof BffError) {
    const reason = error.reason as ConflictKey | undefined;
    if (error.status === 409 && reason && KNOWN.has(reason)) return reason;
    if (error.status === 403) return "forbidden";
    // A self-approval of something sensitive needs a fresh sign-in first (step-up).
    if (
      error.status === 401 &&
      (error.body as { code?: unknown } | undefined)?.code === "reauth_required"
    )
      return "reauth";
  }
  return "failed";
}

/** manar-api's own plain sentence for a 403 (who may decide), when it sent one. */
export function serverMessage(error: unknown): string | undefined {
  if (!(error instanceof BffError)) return undefined;
  const m = (error.body as { message?: unknown } | undefined)?.message;
  return typeof m === "string" ? m : undefined;
}
