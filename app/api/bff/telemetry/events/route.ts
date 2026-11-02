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
/** Reads at most `max` bytes; null when the body is larger (the stream is cancelled). */
async function readCapped(request: NextRequest, max: number): Promise<string | null> {
  if (Number(request.headers.get("content-length") ?? 0) > max) return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function POST(request: NextRequest) {
  const done = new NextResponse(null, { status: 204 });
  if (!checkCrossSiteRequest("POST", request.headers, request.nextUrl.origin).allowed) return done;
  try {
    // Session first: an unauthenticated caller costs us no body read.
    const session = await getSession();
    const token = session ? freshAccessToken(session) : null;
    if (!session || !token) return done;
    const body = await readCapped(request, MAX_BODY_BYTES);
    if (!body) return done;
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
