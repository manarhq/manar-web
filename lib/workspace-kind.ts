import "server-only";

import { env } from "@/lib/env";
import type { SessionPayload } from "@/lib/auth/session";

export type WorkspaceKind = "PERSONAL" | "COMPANY" | "SAMPLE";

/**
 * Which workspace type the signed-in session belongs to. It picks the shell: PERSONAL and
 * SAMPLE get the personal shell, COMPANY gets the operations console.
 *
 * The value is the session's `workspaceKind` (the identity track fills it from manar-api's auth
 * context). Until it does, every session is COMPANY, so the console is unchanged. Fails closed to
 * the console on anything unrecognised. MANAR_WORKSPACE_KIND_OVERRIDE forces a kind for previews
 * and is ignored in production.
 */
export function resolveWorkspaceKind(
  session: Pick<SessionPayload, "workspaceKind"> | null,
): WorkspaceKind {
  if (env.NODE_ENV !== "production" && env.MANAR_WORKSPACE_KIND_OVERRIDE) {
    return env.MANAR_WORKSPACE_KIND_OVERRIDE;
  }
  return session?.workspaceKind ?? "COMPANY";
}

export function usesPersonalShell(kind: WorkspaceKind): boolean {
  return kind === "PERSONAL" || kind === "SAMPLE";
}
