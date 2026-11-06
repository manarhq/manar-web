import "server-only";

import type { QueryClient } from "@tanstack/react-query";

import { freshAccessToken } from "@/lib/auth/token.server";
import { getSession } from "@/lib/auth/session.server";
import { normalizeCursorPage } from "@/lib/api/find-by-id";
import { env } from "@/lib/env";

/**
 * Server-side data for first paint. The page's client hooks (hooks/use-*.ts) keep owning each
 * query: these functions put the SAME data under the SAME query key, so TanStack Query hydrates it
 * and the page renders without a spinner. Everything here fails soft: any error, a slow API or an
 * expired token returns nothing, and the client fetches as before through the BFF. The access
 * token never leaves the server (the browser still only holds the session cookie); no refresh
 * happens here (lib/auth/token.server.ts says why).
 */

// Short on purpose: this sits in front of every console page's first byte, so a slow API costs at
// most this much once, and the client then fetches as before.
const PREFETCH_TIMEOUT_MS = 800;

async function serverGet<T>(path: string): Promise<T | null> {
  try {
    const session = await getSession();
    const token = session && freshAccessToken(session);
    if (!session?.workspaceId || !token) return null;
    const response = await fetch(new URL(path, env.MANAR_API_BASE_URL), {
      headers: { Authorization: `Bearer ${token}`, "X-Manar-Workspace": session.workspaceId },
      cache: "no-store",
      signal: AbortSignal.timeout(PREFETCH_TIMEOUT_MS),
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

async function prefetchInfinite(qc: QueryClient, queryKey: unknown[], path: string) {
  const page = await serverGet<{ items: unknown[]; nextCursor: unknown }>(path);
  if (page)
    qc.setQueryData(queryKey, { pages: [normalizeCursorPage(page)], pageParams: [undefined] });
}

/** What every console page's shell reads: the waiting approvals (agent tasks and devices). */
export async function prefetchPendingApprovals(qc: QueryClient) {
  await Promise.all([
    prefetchInfinite(
      qc,
      ["approvals", "list", { status: "PENDING" }],
      "/approvals?status=PENDING&limit=50",
    ),
    serverGet<{ items: unknown[] }>("/host-approvals").then((r) => {
      if (r) qc.setQueryData(["approvals", "host"], r.items);
    }),
  ]);
}

/** Personal Home: the device list and the per-device tool inventory. */
export async function prefetchHome(qc: QueryClient) {
  await Promise.all([
    prefetchInfinite(qc, ["hosts", "list", "", ""], "/hosts?limit=50"),
    serverGet<{ devices: unknown[] }>("/ai-tools").then((r) => {
      if (r) qc.setQueryData(["ai-tools"], r.devices);
    }),
  ]);
}
