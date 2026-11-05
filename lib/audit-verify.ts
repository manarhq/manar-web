/**
 * The newest time the whole chain was verified, from manar-api's `lastFullVerifiedAt` (added by
 * the api-core track; not in the generated schema until `pnpm api:codegen` picks it up). Absent
 * or null means the API has no full verification on record: say so, never imply one.
 */
export function lastFullVerifiedAt(data: unknown): string | null {
  const value = (data as { lastFullVerifiedAt?: unknown } | undefined)?.lastFullVerifiedAt;
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}
