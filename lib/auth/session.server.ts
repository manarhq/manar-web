import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { decryptSession, readSessionCookieValue, type SessionPayload } from "@/lib/auth/session";

/** Reads and decrypts the current request's session cookie, memoized per
 * request (React `cache`) so Server Components and layouts that both need
 * the session don't each pay a decrypt. Returns `null` for "no session" —
 * callers that require auth should use `proxy.ts`'s route protection
 * rather than each re-implementing a redirect. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const raw = readSessionCookieValue(store);
  if (!raw) return null;
  return decryptSession(raw);
});
