import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { checkCrossSiteRequest } from "@/lib/api/bff-request";
import { getSession } from "@/lib/auth/session.server";
import { freshAccessToken } from "@/lib/auth/token.server";

const MAX_BODY_BYTES = 64 * 1024;

/**
 * `POST /api/bff/telemetry/events`: forwards product-improvement events to manar-api with the
 * user's token. Always answers 204, whatever happens: telemetry fails silently, and manar-api
 * (which checks the user's and the workspace's switches) is the authority on what is kept.
 * An expired access token drops the event rather than refreshing the session for it.
 */
export async function POST(request: NextRequest) {
  const done = new NextResponse(null, { status: 204 });
  if (!checkCrossSiteRequest("POST", request.headers, request.nextUrl.origin).allowed) return done;
  try {
    const body = await request.text();
    if (!body || body.length > MAX_BODY_BYTES) return done;
    const session = await getSession();
    const token = session ? freshAccessToken(session) : null;
    if (!session || !token) return done;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    if (session.workspaceId) headers["X-Manar-Workspace"] = session.workspaceId;
    await fetch(new URL("/telemetry/events", env.MANAR_API_BASE_URL), {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    // Silent by design.
  }
  return done;
}
