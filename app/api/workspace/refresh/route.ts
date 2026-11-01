import { NextResponse, type NextRequest } from "next/server";

import { checkCrossSiteRequest } from "@/lib/api/bff-request";
import { jsonWithSession, sessionFromRequest } from "@/lib/auth/session-refresh.server";
import { resolveWorkspace } from "@/lib/auth/workspace.server";

/**
 * Polled by the "Setting up your workspace" screen: re-reads the caller's workspaces and, once one
 * is ready, stores it in the session.
 */
export async function POST(request: NextRequest) {
  const csrf = checkCrossSiteRequest(request.method, request.headers, request.nextUrl.origin);
  if (!csrf.allowed) {
    return NextResponse.json({ error: "cross_site_request_blocked" }, { status: 403 });
  }
  const current = await sessionFromRequest(request).catch(() => null);
  if (!current) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const resolution = await resolveWorkspace(current.session.accessToken, {
      preferredId: current.session.workspaceId,
    });
    if (resolution.state !== "ready") return NextResponse.json({ state: resolution.state });
    return jsonWithSession(
      { state: "ready" },
      {
        ...current.session,
        workspaceId: resolution.workspaceId,
        workspaceKind: resolution.workspaceKind,
      },
    );
  } catch (error) {
    console.error("Workspace refresh failed", error);
    return NextResponse.json({ error: "bff_error" }, { status: 502 });
  }
}
