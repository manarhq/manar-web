import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { routing } from "@/i18n/routing";
import {
  decryptSession,
  deleteSessionCookie,
  encryptSession,
  isAccessTokenExpired,
  isRefreshable,
  readSessionCookieValue,
  sessionCookieOptions,
  setSessionCookie,
} from "@/lib/auth/session";
import { TokenEndpointError } from "@/lib/auth/oidc";
import { refreshSession } from "@/lib/auth/session-refresh.server";
import { env } from "@/lib/env";
import { contentSecurityPolicy, STATIC_SECURITY_HEADERS } from "@/lib/security-headers";

/**
 * Combines next-intl's locale routing with route protection (Section 67:
 * "protect all app routes"). Runs on the Node.js runtime (Next.js 16
 * default for `proxy.ts`, formerly `middleware.ts` — see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md's
 * "Migration to Proxy" section), which is what makes it safe to decrypt
 * the session cookie here with the same `jose`-based helper the route
 * handlers use, rather than a separate Edge-safe reimplementation.
 *
 * This only checks whether a *plausible, not-fully-expired* session
 * exists — it never calls out to Keycloak or manar-api from here (kept
 * deliberately cheap, per Next's own guidance to treat Proxy as a fast
 * gate, not a place for business logic). Access-token refresh-on-demand
 * happens at the actual data-access boundary (app/api/bff/[...path]),
 * the first time a request needs a fresh token.
 */
const PUBLIC_PATHS = new Set(["/login"]);

const intlMiddleware = createIntlMiddleware(routing);

function stripLocalePrefix(pathname: string): string {
  const match = routing.locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (!match) return pathname;
  const rest = pathname.slice(`/${match}`.length);
  return rest === "" ? "/" : rest;
}

type CookieWrite = { name: string; value: string; options: Record<string, unknown> };
type SessionCheck = { valid: false } | { valid: true; refreshed?: CookieWrite[] };

/**
 * Is there a usable session? An expired access token is refreshed HERE, on a page navigation,
 * because this is a place that can store the result: the new cookie goes on the response and the
 * downstream request sees it too (so Server Components read the fresh token and never refresh
 * themselves). A refresh that fails ends the session.
 */
async function checkSession(request: NextRequest): Promise<SessionCheck> {
  const raw = readSessionCookieValue(request.cookies);
  if (!raw) return { valid: false };
  const session = await decryptSession(raw);
  if (!session) return { valid: false };
  if (!isAccessTokenExpired(session)) return { valid: true };
  if (!isRefreshable(session)) return { valid: false };
  try {
    const next = await refreshSession(session);
    const cookies: CookieWrite[] = [];
    setSessionCookie(
      { set: (name, value, options) => cookies.push({ name, value, options: options ?? {} }) },
      await encryptSession(next),
      sessionCookieOptions,
    );
    return { valid: true, refreshed: cookies };
  } catch (error) {
    // The identity provider refused the grant (4xx): the session is over. Anything else (a network
    // error, a 5xx) is transient: keep the current session while its access token is still good,
    // and try again on the next request.
    const refused =
      error instanceof TokenEndpointError && error.status >= 400 && error.status < 500;
    if (!refused && Date.now() < session.accessTokenExpiresAt) return { valid: true };
    return { valid: false };
  }
}

/** The request's Cookie header with the session chunks replaced by the refreshed ones. */
function cookieHeaderWith(original: string | null, chunks: CookieWrite[]): string {
  const kept = (original ?? "")
    .split(/;\s*/)
    .filter((pair) => pair && !/^manar_session(\.\d+)?=/.test(pair));
  return [...kept, ...chunks.filter((c) => c.value !== "").map((c) => `${c.name}=${c.value}`)].join(
    "; ",
  );
}

function withHeaders(res: NextResponse, csp: string): NextResponse {
  for (const [k, v] of Object.entries(STATIC_SECURITY_HEADERS)) res.headers.set(k, v);
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export default async function proxy(request: NextRequest) {
  // A fresh nonce per request; Next.js reads it from the request's CSP header and puts it on its
  // own scripts, and app/[locale]/layout.tsx passes `x-nonce` to the inline ones.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(
    nonce,
    env.NODE_ENV === "development",
    env.APP_BASE_URL.startsWith("https:"),
  );

  // BFF and auth routes authenticate themselves; here they only get the headers.
  if (request.nextUrl.pathname.startsWith("/api/")) return withHeaders(NextResponse.next(), csp);

  const pathWithoutLocale = stripLocalePrefix(request.nextUrl.pathname);

  let refreshed: CookieWrite[] | undefined;
  if (!PUBLIC_PATHS.has(pathWithoutLocale)) {
    const check = await checkSession(request);
    if (check.valid) refreshed = check.refreshed;
    if (!check.valid) {
      const locale =
        routing.locales.find((l) => request.nextUrl.pathname.startsWith(`/${l}`)) ??
        routing.defaultLocale;
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("from", request.nextUrl.pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      deleteSessionCookie(redirectResponse.cookies);
      return withHeaders(redirectResponse, csp);
    }
  }

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  if (refreshed) headers.set("cookie", cookieHeaderWith(request.headers.get("cookie"), refreshed));
  const response = intlMiddleware(
    new NextRequest(request.url, { headers, method: request.method }),
  );
  if (refreshed) {
    // Persist the rotated tokens for the browser's next request.
    for (const c of refreshed) response.cookies.set(c.name, c.value, c.options);
  }
  return withHeaders(response, csp);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
