import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { Agent } from "undici";

import { env } from "@/lib/env";
import {
  UnsafeUpstreamPathError,
  UpstreamOriginMismatchError,
  assertUpstreamOrigin,
  buildForwardHeaders,
  buildUpstreamUrl,
  LONG_TIMEOUT_MS,
  isTimeoutError,
  upstreamTimeoutMs,
  checkCrossSiteRequest,
} from "@/lib/api/bff-request";
import { TokenEndpointError } from "@/lib/auth/oidc";
import { refreshSession } from "@/lib/auth/session-refresh.server";
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

/**
 * Node's global `fetch` is backed by undici, whose default dispatcher caps
 * `headersTimeout`/`bodyTimeout` at ~300000ms (5 min) -- a limit that is
 * independent of (and shorter than) the `signal: request.signal` passed to
 * the `fetch()` call below. That signal only covers genuine user-initiated
 * cancellation (closing the tab, navigating away); it does nothing to raise
 * undici's own internal ceiling.
 *
 * The long-form AI-advisory routes (`/audit/investigate`,
 * `/policies/suggest`) can legitimately run past 300s on CPU-only inference
 * hardware: manar-api's own `AI_ADVISORY_LONGFORM_TIMEOUT_MS` is documented
 * up to 180000ms for real demo hardware (`manar-api/docs/demo.md`), and this
 * environment's local `manar-api/.env` raises it further, to 450000ms, for
 * exactly that reason. Real completions of 250-420s have been observed live.
 * Without this override, undici aborts the outgoing fetch on its own before
 * manar-api's genuinely-successful result can come back, and the `catch`
 * block below turns that into a raw 502 -- even though the upstream call
 * succeeded. That undermines this app's calm `available: false` promise for
 * calls that are slow but succeeding, not actually failing.
 *
 * 600000ms (10 min) is the chosen ceiling: real headroom above both the
 * documented 180s config max and this environment's currently-configured
 * 450s backend timeout, while still being a real, bounded ceiling -- this
 * proxy must never wait forever on a truly hung upstream. See
 * docs/dependency-decisions.md for the full write-up of why `undici` is now
 * a direct dependency instead of an implicit transitive one.
 */
const UPSTREAM_DISPATCH_TIMEOUT_MS = LONG_TIMEOUT_MS;
const upstreamDispatcher = new Agent({
  headersTimeout: UPSTREAM_DISPATCH_TIMEOUT_MS,
  bodyTimeout: UPSTREAM_DISPATCH_TIMEOUT_MS,
  connect: { timeout: 5_000 },
});

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
    throw new TokenEndpointError("Session refresh", 400, "invalid_grant");
  }
  const next = await refreshSession(session);
  return { session: next, cookieValue: await encryptSession(next) };
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
  } catch (error) {
    // Only a refused grant ends the session. An IdP outage or timeout keeps the cookie so the
    // next request can retry.
    if (
      error instanceof TokenEndpointError &&
      error.status === 400 &&
      error.code === "invalid_grant"
    ) {
      const response = NextResponse.json(
        { error: "session_expired", message: "Session expired. Please sign in again." },
        { status: 401 },
      );
      deleteSessionCookie(response.cookies);
      return response;
    }
    console.error("BFF session refresh failed", error instanceof Error ? error.name : error);
    return NextResponse.json(
      { error: "auth_unavailable", message: "Sign-in service is unavailable. Try again." },
      { status: 503 },
    );
  }

  // Where this request goes, and what travels with it, are both
  // token-disclosure controls rather than routing details -- see
  // lib/api/bff-request.ts for the protocol-relative-URL escape this
  // replaces. `assertUpstreamOrigin` is called a second time immediately
  // before dispatch on purpose: it is the invariant, not the parser.
  const upstreamUrl = buildUpstreamUrl(path, request.nextUrl.search, env.MANAR_API_BASE_URL);
  assertUpstreamOrigin(upstreamUrl, env.MANAR_API_BASE_URL);

  const forwardHeaders = buildForwardHeaders(request.headers, fresh.session.accessToken);
  // The active workspace comes from the session, never from the browser's own header. manar-api
  // checks it against Membership on every request.
  forwardHeaders.delete("x-manar-workspace");
  if (fresh.session.workspaceId) {
    forwardHeaders.set("X-Manar-Workspace", fresh.session.workspaceId);
  }

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
    signal: AbortSignal.any([request.signal, AbortSignal.timeout(upstreamTimeoutMs(path))]),
    // Node's fetch, when backed by undici (the case here), accepts a
    // `dispatcher` option -- TypeScript's built-in `RequestInit` doesn't
    // know about it, hence the narrow additive cast rather than an `any`.
    dispatcher: upstreamDispatcher,
  } as RequestInit & { dispatcher?: Agent });

  const responseHeaders = new Headers();
  upstreamResponse.headers.forEach((value, key) => {
    const name = key.toLowerCase();
    // manar-api never sets cookies on the console origin, and must not be able to.
    if (!HOP_BY_HOP_RESPONSE_HEADERS.has(name) && name !== "set-cookie") {
      responseHeaders.set(key, value);
    }
  });
  // An API answer is data, never a page of the console: if one ever came back as HTML, it would
  // render sandboxed with nothing allowed, so it cannot run script on this origin (audit, 3 Nov).
  responseHeaders.set("Content-Security-Policy", "sandbox; default-src 'none'");
  responseHeaders.set("X-Content-Type-Options", "nosniff");

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

  // Cross-site forgery check for state-changing methods. GET/HEAD are
  // deliberately not checked here -- what made a cross-site GET dangerous
  // was that it could be aimed at an attacker's host, and that is fixed in
  // `buildUpstreamUrl`, not here. See `checkCrossSiteRequest`'s doc comment
  // for why this is written around what the request demonstrably is rather
  // than assuming every caller is a browser (this app's own Server
  // Components call the BFF server-to-server).
  const csrf = checkCrossSiteRequest(request.method, request.headers, request.nextUrl.origin);
  if (!csrf.allowed) {
    console.warn("BFF rejected a cross-site state-changing request", { reason: csrf.reason });
    return NextResponse.json(
      {
        error: "cross_site_request_blocked",
        message: "Cross-site state-changing requests are not accepted.",
      },
      { status: 403 },
    );
  }

  try {
    return await handle(request, path);
  } catch (error) {
    // A rejected upstream path is a client error and a security event --
    // never a 502, which would read as "manar-api is unwell" and hide it.
    if (error instanceof UnsafeUpstreamPathError || error instanceof UpstreamOriginMismatchError) {
      console.error("BFF refused to dispatch an unsafe upstream request", error);
      return NextResponse.json(
        { error: "invalid_upstream_path", message: "The requested path is not valid." },
        { status: 400 },
      );
    }
    // The browser went away: nothing to answer and nothing to log.
    if (request.signal.aborted) return new Response(null, { status: 499 });
    if (isTimeoutError(error)) {
      return NextResponse.json(
        { error: "bff_timeout", message: "manar-api took too long to answer." },
        { status: 504 },
      );
    }
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
