/**
 * Release 2026-11-11 — the request-construction rules for the BFF proxy
 * (`app/api/bff/[...path]/route.ts`).
 *
 * This module exists because the BFF is the single place in this app that
 * attaches a real `Authorization: Bearer <token>` header (see
 * docs/auth-flow.md). Anything that can influence *where that request
 * goes*, or *what else travels with it*, is therefore a token-disclosure
 * control — not routing plumbing. Pulling it out of the route handler
 * makes it directly unit-testable (`__tests__/bff-request.test.ts`);
 * before this, the only way to exercise it was to run the whole app.
 *
 * ## The defect this replaces
 *
 * The proxy previously built its upstream URL as:
 *
 * ```ts
 * new URL(`/${path.join("/")}${request.nextUrl.search}`, env.MANAR_API_BASE_URL)
 * ```
 *
 * Next decodes each catch-all segment individually, so a request to
 * `/api/bff/%2Fcollector.example/x` yields `path = ["/collector.example", "x"]`.
 * Joining that produces `"//collector.example/x"`, which is a
 * **protocol-relative reference**: `new URL()` resolves it against the
 * base's *scheme* and discards the base's host entirely, giving
 * `http://collector.example/x`. The proxy would then decrypt the victim's
 * session, refresh it, and send their Keycloak access token to that host.
 * The session cookie is `SameSite=Lax`, so a top-level cross-site GET —
 * an ordinary link or redirect — carries it, making this reachable with
 * no interaction beyond a click.
 *
 * Two independent controls are applied below rather than one, because the
 * first is a parsing rule and the second is an invariant: even if some
 * future encoding subtlety slips a hostile value past segment validation,
 * `assertUpstreamOrigin` still refuses to dispatch anywhere but the
 * configured manar-api origin.
 */

/** Thrown when a catch-all path segment cannot be safely placed into the upstream URL. */
export class UnsafeUpstreamPathError extends Error {
  constructor(reason: string) {
    super(`Unsafe BFF upstream path: ${reason}`);
    this.name = "UnsafeUpstreamPathError";
  }
}

/** Thrown when the constructed upstream URL does not point at the configured manar-api origin. */
export class UpstreamOriginMismatchError extends Error {
  constructor(actualOrigin: string, expectedOrigin: string) {
    super(
      `BFF refused to dispatch: upstream origin ${actualOrigin} is not the configured manar-api origin ${expectedOrigin}`,
    );
    this.name = "UpstreamOriginMismatchError";
  }
}

/**
 * Characters that must never appear inside a single decoded path segment.
 *
 * `/` and `\` are the ones that actually cause the protocol-relative
 * escape above. `.`/`..` are rejected as whole segments because they let a
 * caller traverse outside any base path prefix. Control characters and
 * NUL are rejected because they have no legitimate use in a REST path and
 * are a common way to confuse a downstream parser that disagrees with
 * this one about where a URL ends.
 */
function assertSafeSegment(segment: string): void {
  if (segment.length === 0) {
    throw new UnsafeUpstreamPathError("empty segment");
  }
  if (segment.includes("/") || segment.includes("\\")) {
    throw new UnsafeUpstreamPathError(
      "a segment contained a path separator, which can escape the configured upstream host",
    );
  }
  if (segment === "." || segment === "..") {
    throw new UnsafeUpstreamPathError("relative traversal segment");
  }
  if (/[\u0000-\u001f\u007f]/.test(segment)) {
    throw new UnsafeUpstreamPathError("a segment contained a control character");
  }
}

/**
 * Builds the upstream URL from the catch-all segments, the incoming query
 * string, and the configured manar-api base URL.
 *
 * Each segment is re-encoded with `encodeURIComponent`. That is the point:
 * Next hands back *decoded* segments, so re-encoding is what guarantees
 * the value lands in exactly one path position no matter what it contains.
 * A base URL carrying a path prefix is preserved (the previous
 * absolute-path construction silently discarded it).
 *
 * The query string is passed through as received. It cannot affect the
 * destination host — it is appended after the origin and path are already
 * fixed — and rewriting it would break filter values that legitimately
 * contain encoded characters.
 */
export function buildUpstreamUrl(segments: string[], search: string, baseUrl: string): URL {
  if (segments.length === 0) {
    throw new UnsafeUpstreamPathError("no path segments");
  }
  for (const segment of segments) {
    assertSafeSegment(segment);
  }

  const base = new URL(baseUrl);
  const basePath = base.pathname.replace(/\/+$/, "");
  const encodedPath = segments.map((segment) => encodeURIComponent(segment)).join("/");

  const upstream = new URL(`${basePath}/${encodedPath}${search}`, base);
  assertUpstreamOrigin(upstream, baseUrl);
  return upstream;
}

/**
 * The backstop invariant: the proxy dispatches to the configured
 * manar-api origin or it does not dispatch at all.
 *
 * Kept as its own exported function, and called again at the dispatch
 * site, so that this holds even if a future change constructs the URL
 * some other way.
 */
export function assertUpstreamOrigin(upstream: URL, baseUrl: string): void {
  const expected = new URL(baseUrl).origin;
  if (upstream.origin !== expected) {
    throw new UpstreamOriginMismatchError(upstream.origin, expected);
  }
}

/**
 * Request headers the browser must never be able to set on a proxied
 * call.
 *
 * The proxy previously forwarded every header except the four hop-by-hop
 * ones. That makes it a confused deputy: manar-api trusts
 * `x-manar-bff-token` as the sole credential on
 * `GET /tenants/:slug/oidc-client-secret`, and `x-platform-operator-token`
 * as the sole credential on the platform-wide kill switch. A page in the
 * victim's browser could set either header on a same-origin fetch and have
 * the BFF relay it verbatim, upgrading any leak of those static secrets
 * into direct browser exploitability.
 *
 * `x-forwarded-*` is stripped because this proxy is the thing entitled to
 * describe the client to manar-api; letting the client pre-populate those
 * headers lets it lie about its own address to anything upstream that
 * reads them.
 *
 * `authorization` is stripped explicitly rather than relying on the fact
 * that the proxy overwrites it a few lines later — an ordering dependency
 * is not a security control.
 */
const DENIED_REQUEST_HEADER_PREFIXES = ["x-manar-", "x-platform-", "x-forwarded-"];

const DENIED_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "cookie",
  "content-length",
  "authorization",
  "x-real-ip",
  // RFC 9110 hop-by-hop set: describes the client-to-BFF hop only, and undici
  // rejects some of these (e.g. transfer-encoding) on the upstream request.
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "keep-alive",
  "proxy-authorization",
  "proxy-connection",
  "expect",
]);

/** True when this header must not be relayed upstream. */
export function isDeniedRequestHeader(name: string): boolean {
  const lower = name.toLowerCase();
  if (DENIED_REQUEST_HEADERS.has(lower)) return true;
  return DENIED_REQUEST_HEADER_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/** Builds the header set actually sent upstream: the caller's headers minus the denylist, plus the session's bearer token. */
export function buildForwardHeaders(incoming: Headers, accessToken: string): Headers {
  const forward = new Headers();
  // Any header named in `Connection` is hop-by-hop too.
  const named = new Set(
    (incoming.get("connection") ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
  );
  incoming.forEach((value, key) => {
    if (!isDeniedRequestHeader(key) && !named.has(key.toLowerCase())) {
      forward.set(key, value);
    }
  });
  forward.set("Authorization", `Bearer ${accessToken}`);
  return forward;
}

/**
 * Cross-site request forgery check for state-changing methods.
 *
 * The session cookie is `SameSite=Lax`, which already blocks a cross-site
 * top-level POST — but Lax does not cover a sibling subdomain, and this
 * app's own Server Components legitimately call the BFF server-to-server
 * with no browser headers at all (`getServerApiClient(origin)` in
 * `lib/api/client.ts`). So the rule is written around what the request
 * demonstrably *is*, rather than assuming every caller is a browser:
 *
 * - `Sec-Fetch-Site: same-origin` — a browser telling us this came from
 *   our own origin. Allow.
 * - `Sec-Fetch-Site` present and anything else (`cross-site`, `same-site`,
 *   `none`) — a browser telling us it did not. Reject. `none` means a
 *   user-typed URL or a bookmark, which is never how this app performs a
 *   mutation.
 * - No `Sec-Fetch-Site` and no `Origin` — not a browser request (every
 *   current browser sends `Sec-Fetch-Site`). This is the server-side
 *   client path. Allow.
 * - No `Sec-Fetch-Site` but an `Origin` that matches our own — an older
 *   browser or a non-browser client that set `Origin`. Allow only on an
 *   exact origin match.
 *
 * GET/HEAD are not checked here. That is deliberate and is *not* what
 * protects them: a GET through this proxy is protected by
 * `buildUpstreamUrl`, because the only reason a cross-site GET was
 * dangerous was that it could be aimed at an attacker's host.
 */
export type CsrfVerdict = { allowed: true } | { allowed: false; reason: string };

export function checkCrossSiteRequest(
  method: string,
  headers: Headers,
  appOrigin: string | null,
): CsrfVerdict {
  if (method === "GET" || method === "HEAD") {
    return { allowed: true };
  }

  const fetchSite = headers.get("sec-fetch-site");
  if (fetchSite !== null) {
    return fetchSite === "same-origin"
      ? { allowed: true }
      : { allowed: false, reason: `sec-fetch-site: ${fetchSite}` };
  }

  const origin = headers.get("origin");
  if (origin === null) {
    return { allowed: true };
  }
  if (appOrigin !== null && origin === appOrigin) {
    return { allowed: true };
  }
  return { allowed: false, reason: `origin: ${origin}` };
}

/** Routes that legitimately run long (AI advisory) or stream (SSE) get the long ceiling. */
const LONG_ROUTES = new Set(["audit/investigate", "policies/suggest", "events/live"]);
export const LONG_TIMEOUT_MS = 600_000;
export const DEFAULT_TIMEOUT_MS = 30_000;

export function upstreamTimeoutMs(path: string[]): number {
  return LONG_ROUTES.has(path.join("/")) ? LONG_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
}

/** An abort-signal timeout or an undici connect/headers/body timeout. */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "TimeoutError") return true;
  const code = (error as { cause?: { code?: string } } | null)?.cause?.code;
  return typeof code === "string" && /^UND_ERR_(CONNECT|HEADERS|BODY)_TIMEOUT$/.test(code);
}
