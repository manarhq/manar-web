import "server-only";

import { env } from "@/lib/env";
import type { WorkspaceKind } from "@/lib/workspace-kind";

/** One row of manar-api's `GET /workspaces`. */
export interface WorkspaceItem {
  tenantId: string;
  name: string;
  kind: WorkspaceKind;
  /** Tenant lifecycle: ACTIVE when ready; QUEUED or PROVISIONING while being set up. */
  status: string;
  membershipStatus: "ACTIVE" | "PENDING" | "REMOVED";
  roles: string[];
}

export type WorkspaceResolution =
  | { state: "ready"; workspaceId: string; workspaceKind: WorkspaceKind }
  | { state: "setting-up" }
  | { state: "none" };

function api(path: string, accessToken: string, init: RequestInit & { workspaceId?: string } = {}) {
  const { workspaceId, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (workspaceId) headers.set("X-Manar-Workspace", workspaceId);
  return fetch(new URL(path, env.MANAR_API_BASE_URL), { ...rest, headers, cache: "no-store" });
}

/** The caller's workspaces. Throws on anything but 200: sign-in fails closed. */
export async function listWorkspaces(accessToken: string): Promise<WorkspaceItem[]> {
  const response = await api("/workspaces", accessToken);
  if (!response.ok) throw new Error(`Listing workspaces failed: HTTP ${response.status}`);
  return ((await response.json()) as { items: WorkspaceItem[] }).items;
}

/**
 * First sign-in: asks manar-api to create the personal workspace (idempotent). A customer-hosted
 * install answers 403 (no personal workspaces there): that is not an error, the user simply has
 * the workspaces an admin gave them.
 */
export async function bootstrapPersonalWorkspace(accessToken: string): Promise<void> {
  const response = await api("/workspaces/bootstrap", accessToken, { method: "POST" });
  if (response.status === 403) return;
  if (!response.ok) throw new Error(`Workspace setup failed: HTTP ${response.status}`);
}

/**
 * Picks the active workspace from the caller's own list: the preferred one when it is ready and
 * theirs, else their personal workspace, else the first ready non-sample one. The choice is only a
 * request: manar-api checks it against Membership on every call.
 */
export function chooseWorkspace(items: WorkspaceItem[], preferredId?: string): WorkspaceResolution {
  const ready = items.filter((w) => w.membershipStatus === "ACTIVE" && w.status === "ACTIVE");
  const pick =
    ready.find((w) => w.tenantId === preferredId) ??
    ready.find((w) => w.kind === "PERSONAL") ??
    ready.find((w) => w.kind !== "SAMPLE");
  if (pick) return { state: "ready", workspaceId: pick.tenantId, workspaceKind: pick.kind };
  const settingUp = items.some(
    (w) =>
      w.membershipStatus === "ACTIVE" && (w.status === "QUEUED" || w.status === "PROVISIONING"),
  );
  return settingUp ? { state: "setting-up" } : { state: "none" };
}

export async function resolveWorkspace(
  accessToken: string,
  opts: { bootstrap?: boolean; preferredId?: string } = {},
): Promise<WorkspaceResolution> {
  if (opts.bootstrap) await bootstrapPersonalWorkspace(accessToken);
  return chooseWorkspace(await listWorkspaces(accessToken), opts.preferredId);
}

/** `GET /me` for the active workspace: who, which workspace, and the roles held in it. */
export interface Me {
  subject: string;
  email: string;
  displayName: string;
  workspace: { id: string; name: string; kind: WorkspaceKind };
  roles: string[];
}

export async function fetchMe(accessToken: string, workspaceId?: string): Promise<Me | null> {
  const response = await api("/me", accessToken, { workspaceId });
  return response.ok ? ((await response.json()) as Me) : null;
}
