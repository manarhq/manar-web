/**
 * manar-api's audit event `decision` field is typed as a plain `string`
 * in `lib/api/schema.d.ts`, not a literal union (its own doc comment:
 * "ALLOW, DENY, REQUIRE_APPROVAL, APPROVE, or DENY (approval
 * decisions)") -- shared here so audit-list-view.tsx's filter/table
 * column and audit-detail-view.tsx's field grid narrow and humanize it
 * identically instead of each file keeping its own copy of the same 4
 * strings (and risking drift between them).
 */
export const AUDIT_DECISIONS = ["ALLOW", "DENY", "REQUIRE_APPROVAL", "APPROVE"] as const;

export type AuditDecisionValue = (typeof AUDIT_DECISIONS)[number];

/** Type guard, not a cast: a value this console has never seen is
 * possible in principle since the schema doesn't constrain it, so
 * callers can fall back to the raw value instead of rendering a
 * missing-translation-key artifact for anything unrecognized. */
export function isKnownAuditDecision(value: string): value is AuditDecisionValue {
  return (AUDIT_DECISIONS as readonly string[]).includes(value);
}
