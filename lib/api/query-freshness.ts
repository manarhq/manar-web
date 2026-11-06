import type { QueryClient } from "@tanstack/react-query";

import { liveQueryOptions } from "@/lib/api/live-query";

/**
 * Every query root key in the console, by how fresh it must be. The default is 30 s with no
 * refetch on window focus (decision 12: non-security data may be that stale). Anything a person
 * relies on to decide or to see protection state is "live": staleTime 0 and a refetch whenever
 * the tab regains focus, plus the invalidate-on-change that mutations and the live stream do.
 * __tests__/query-freshness.test.ts fails when a hook introduces a root key that is in neither
 * list, so each new query is classified on purpose.
 */
export const LIVE_ROOTS = [
  "approvals", // decisions waiting on a person
  "incidents",
  "agents", // status: quarantined, killed, suspended
  "tasks", // revocation, expiry
  "policies", // the rules that decide
  "tools", // enabled / disabled
  "users", // membership and roles
  "invites",
  "quarantines",
  "hosts", // devices, removal, tamper state
  "edge", // device rules and status
  "ai-systems", // lifecycle: suspended, retired
  "jail", // site rules
  "secrets", // vault access requests
  "workspace", // pause all AI
  "cloud-agents",
] as const;

export const RELAXED_ROOTS = [
  "audit", // history, not state
  "billing",
  "compliance",
  "ai-tools",
  "ai-spend",
  "add-device",
  "contact-email",
  "auto-join-offer",
  "auto-join",
  "deletion",
  "tenant-license",
  "tenant-settings",
  "ai-default-notice", // a one-time notice; a stale copy shows it a little longer
  "start-mode",
  "sessions",
  "session",
  "report-card",
  "public-config",
  "mcp-servers",
  "email-prefs",
  "badge",
  "workspaces",
  "data-preferences",
  "workspace-data-preferences",
] as const;

export function applyFreshness(client: QueryClient): QueryClient {
  for (const root of LIVE_ROOTS) client.setQueryDefaults([root], liveQueryOptions);
  return client;
}
