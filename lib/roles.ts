import type { components } from "@/lib/api/schema";

export type RoleName = components["schemas"]["GrantRoleRequestDto"]["role"];

/**
 * The eight fixed application roles (Section 11), in the exact
 * `SCREAMING_SNAKE_CASE` manar-api's `ROLES` (`src/auth/roles.ts`) and JWT
 * `realm_access.roles` claim use — no dynamic/custom roles exist in this
 * product (Phase 14's design spec, "Out of scope").
 */
export const ROLES: readonly RoleName[] = [
  "TENANT_OWNER",
  "SECURITY_ADMIN",
  "AI_GOVERNANCE_MANAGER",
  "SOC_OPERATOR",
  "APPROVER",
  "AUDITOR",
  "DEVELOPER",
  "READ_ONLY",
];

/**
 * A client-side mirror of manar-api's `ROLE_PRIVILEGE_ORDER`
 * (`src/auth/role-privilege.ts`) — most-privileged first, same ordering,
 * same rationale (see that file's doc comment for the full explanation of
 * why each role sits where it does). This is a **UX nicety only**: the
 * `/users` page uses it to avoid ever *offering* a grant/revoke the
 * backend would reject anyway, not to enforce anything itself — manar-api's
 * `UsersService.grantRole`/`revokeRole` re-derive and re-check this same
 * rule server-side on every request regardless of what this file computes,
 * exactly per this product's rule against frontend-only security controls.
 * Keep in sync with the backend file by hand; there is no shared package
 * between the two repos this could be generated from.
 */
export const ROLE_PRIVILEGE_ORDER: readonly RoleName[] = [
  "TENANT_OWNER",
  "SECURITY_ADMIN",
  "AI_GOVERNANCE_MANAGER",
  "SOC_OPERATOR",
  "APPROVER",
  "AUDITOR",
  "DEVELOPER",
  "READ_ONLY",
];

/** Lower rank == more privileged. `TENANT_OWNER` is rank 0, `READ_ONLY` is rank 7. */
export function privilegeRank(role: RoleName): number {
  return ROLE_PRIVILEGE_ORDER.indexOf(role);
}

/** The most-privileged rank among `roles` (the lowest number), or
 * `undefined` if `roles` is empty. */
export function highestPrivilegeRank(roles: readonly string[]): number | undefined {
  const ranks = roles
    .filter((role): role is RoleName => (ROLES as readonly string[]).includes(role))
    .map(privilegeRank);
  if (ranks.length === 0) return undefined;
  return Math.min(...ranks);
}

/**
 * Mirrors manar-api's `canGrantRole`: `actorRoles` may grant/revoke
 * `targetRole` only if at least one role the actor already holds is at
 * least as privileged as `targetRole`. Used identically for both grant
 * and revoke (Phase 14's guard applies the same rule to both — see
 * `UsersController.revokeRole`'s doc comment).
 */
export function canGrantRole(actorRoles: readonly string[], targetRole: RoleName): boolean {
  const bestActorRank = highestPrivilegeRank(actorRoles);
  if (bestActorRank === undefined) return false;
  return bestActorRank <= privilegeRank(targetRole);
}

/** Whether `actorRoles` holds `TENANT_OWNER` or `SECURITY_ADMIN` — the two
 * roles manar-api's `RequireRole` gates role-binding management and
 * tenant-settings endpoints to. A UX nicety (hide controls the backend
 * would 403 anyway), never the real enforcement. */
export function isRoleManager(actorRoles: readonly string[]): boolean {
  return actorRoles.includes("TENANT_OWNER") || actorRoles.includes("SECURITY_ADMIN");
}

/** Roles manar-api lets open `GET /events/live`; the console subscribes only for these. */
const LIVE_FEED_ROLES = ["TENANT_OWNER", "SECURITY_ADMIN", "AUDITOR"];
export function canReadLiveFeed(roles: readonly string[]): boolean {
  return roles.some((r) => LIVE_FEED_ROLES.includes(r));
}
