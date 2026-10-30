import { NextResponse, type NextRequest } from "next/server";

import { checkCrossSiteRequest } from "@/lib/api/bff-request";
import { jsonWithSession, sessionFromRequest } from "@/lib/auth/session-refresh.server";
import { chooseWorkspace, listWorkspaces } from "@/lib/auth/workspace.server";

/**
 * Switch the active workspace. The choice is validated against the caller's own list (manar-api's
 * `GET /workspaces`: ACTIVE membership, ready tenant) before it is stored in the session; manar-api
 * checks it against Membership again on every request.
 */
export async function POST(request: NextRequest) {
  const csrf = checkCrossSiteRequest(request.method, request.headers, request.nextUrl.origin);
  if (!csrf.allowed) {
    return NextResponse.json({ error: "cross_site_request_blocked" }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { tenantId?: unknown } | null;
  const tenantId = typeof body?.tenantId === "string" ? body.tenantId : "";
  const current = await sessionFromRequest(request).catch(() => null);
  if (!current || !tenantId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  try {
    const items = await listWorkspaces(current.session.accessToken);
    const target = items.find((w) => w.tenantId === tenantId);
    const resolution = target ? chooseWorkspace([target], tenantId) : null;
    if (!resolution || resolution.state !== "ready") {
      return NextResponse.json({ error: "workspace_not_available" }, { status: 403 });
    }
    return jsonWithSession(
      { workspaceId: resolution.workspaceId },
      {
        ...current.session,
        workspaceId: resolution.workspaceId,
        workspaceKind: resolution.workspaceKind,
      },
    );
  } catch (error) {
    console.error("Workspace switch failed", error);
    return NextResponse.json({ error: "bff_error" }, { status: 502 });
  }
}
