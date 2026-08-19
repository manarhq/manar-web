import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import {
  decryptSession,
  deleteSessionCookie,
  isAccessTokenExpired,
  isRefreshable,
  readSessionCookieValue,
} from "@/lib/auth/session";

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

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const raw = readSessionCookieValue(request.cookies);
  if (!raw) return false;
  const session = await decryptSession(raw);
  if (!session) return false;
  if (isAccessTokenExpired(session) && !isRefreshable(session)) return false;
  return true;
}

export default async function proxy(request: NextRequest) {
  const pathWithoutLocale = stripLocalePrefix(request.nextUrl.pathname);

  if (!PUBLIC_PATHS.has(pathWithoutLocale)) {
    const authenticated = await hasValidSession(request);
    if (!authenticated) {
      const locale =
        routing.locales.find((l) => request.nextUrl.pathname.startsWith(`/${l}`)) ??
        routing.defaultLocale;
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("from", request.nextUrl.pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      deleteSessionCookie(redirectResponse.cookies);
      return redirectResponse;
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
