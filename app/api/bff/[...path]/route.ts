import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { env } from "@/lib/env";
import { discoverRealm, refreshTokens, getTenantClientSecret } from "@/lib/auth/oidc";
import {
  decryptSession,
  deleteSessionCookie,
  encryptSession,
  isAccessTokenExpired,
  isRefreshable,
  readSessionCookieValue,
  sessionCookieOptions,
  setSessionCookie,
  type SessionPayload,
} from "@/lib/auth/session";

/**
 * The BFF (backend-for-frontend) proxy: the *only* code path that ever
 * attaches a real `Authorization: Bearer <token>` header to a request to
 * manar-api. See docs/auth-flow.md's "Token storage" section — the
 * browser holds an httpOnly session cookie and nothing else; every
 * generated-client call (`lib/api/client.ts`, `baseUrl: "/api/bff"`)
 * lands here first.
 *
 * Refreshes the access token on demand (checked against `exp` before
 * forwarding, not reactively after a 401) and re-encrypts the session
 * cookie on the response when it does. Streams the upstream response body
 * through unmodified, which is what makes this the same code path for
 * both ordinary JSON endpoints and the Server-Sent Events stream
 * (`GET /events/live`) the overview page's live counter subscribes to.
 */

const HOP_BY_HOP_REQUEST_HEADERS = new Set(["host", "connection", "cookie", "content-length"]);
const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-encoding",
  "content-length",
]);

async function ensureFreshSession(
  session: SessionPayload,
): Promise<{ session: SessionPayload; cookieValue?: string }> {
  if (!isAccessTokenExpired(session)) {
    return { session };
  }
  if (!isRefreshable(session)) {
    throw new Error("Session expired and cannot be refreshed");
  }

  const discovery = await discoverRealm(session.tenantSlug);
  if (!discovery) {
    throw new Error(`Tenant "${session.tenantSlug}" no longer resolves to an OIDC config`);
  }
  const clientSecret = await getTenantClientSecret(session.tenantSlug);
  const refreshed = await refreshTokens({
    discovery,
    clientSecret,
    refreshToken: session.refreshToken!,
  });

  const nextSession: SessionPayload = {
    ...session,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? session.refreshToken,
    idToken: refreshed.id_token ?? session.idToken,
    accessTokenExpiresAt: Date.now() + refreshed.expires_in * 1000,
    refreshTokenExpiresAt: refreshed.refresh_expires_in
      ? Date.now() + refreshed.refresh_expires_in * 1000
      : session.refreshTokenExpiresAt,
  };

  return { session: nextSession, cookieValue: await encryptSession(nextSession) };
}

async function handle(request: NextRequest, path: string[]): Promise<Response> {
  const store = await cookies();
  const raw = readSessionCookieValue(store);
  const session = raw ? await decryptSession(raw) : null;

  if (!session) {
    return NextResponse.json(
      { error: "unauthenticated", message: "No active session." },
      { status: 401 },
    );
  }

  let fresh: { session: SessionPayload; cookieValue?: string };
  try {
    fresh = await ensureFreshSession(session);
  } catch {
    const response = NextResponse.json(
      { error: "session_expired", message: "Session expired. Please sign in again." },
      { status: 401 },
    );
    deleteSessionCookie(response.cookies);
    return response;
  }

  const upstreamUrl = new URL(
    `/${path.join("/")}${request.nextUrl.search}`,
    env.MANAR_API_BASE_URL,
  );

  const forwardHeaders = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_REQUEST_HEADERS.has(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  });
  forwardHeaders.set("Authorization", `Bearer ${fresh.session.accessToken}`);

  const hasBody = !["GET", "HEAD"].includes(request.method);

  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers: forwardHeaders,
    body: hasBody ? request.body : undefined,
    // Node's fetch requires this whenever a streamed (ReadableStream) body
    // is supplied to a request — required so `POST`/`PUT`/`PATCH` bodies
    // stream through rather than needing to be buffered first.
    duplex: hasBody ? "half" : undefined,
    redirect: "manual",
    cache: "no-store",
    signal: request.signal,
  } as RequestInit);

  const responseHeaders = new Headers();
  upstreamResponse.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  const response = new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });

  if (fresh.cookieValue) {
    setSessionCookie(response.cookies, fresh.cookieValue, sessionCookieOptions);
  }

  return response;
}

async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  try {
    return await handle(request, path);
  } catch (error) {
    console.error("BFF proxy error", error);
    return NextResponse.json(
      { error: "bff_error", message: "Failed to reach manar-api." },
      { status: 502 },
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
