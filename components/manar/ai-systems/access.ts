/**
 * The three roles manar-api's `AiSystemsController` gates every write to
 * (`@RequireRole('AI_GOVERNANCE_MANAGER', 'SECURITY_ADMIN',
 * 'TENANT_OWNER')` on create, update, transition and every link/unlink).
 *
 * Reads are deliberately open to any authenticated tenant user — the
 * controller's own reasoning is that an auditor or approver needs to see
 * what a system is and who owns it to do their job — so this never gates
 * the *page*, only the write affordances on it. A reader gets the whole
 * record plus an explicit read-only notice rather than a set of buttons
 * that would 403.
 *
 * A UX nicety on top of, never instead of, manar-api's `RolesGuard`,
 * which re-checks this regardless of what the UI rendered. Same posture
 * and same wording as `lib/roles.ts`'s `isRoleManager`.
 */
export const AI_SYSTEM_WRITE_ROLES = [
  "AI_GOVERNANCE_MANAGER",
  "SECURITY_ADMIN",
  "TENANT_OWNER",
] as const;

export function canManageAiSystems(roles: readonly string[]): boolean {
  return AI_SYSTEM_WRITE_ROLES.some((role) => roles.includes(role));
}
