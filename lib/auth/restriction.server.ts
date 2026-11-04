import "server-only";

import { cache } from "react";

import { freshAccessToken } from "@/lib/auth/token.server";
import { getSession } from "@/lib/auth/session.server";
import { env } from "@/lib/env";

export const RESTRICTION_CATEGORIES = [
  "terms_violation",
  "abuse_or_attack",
  "fraud_or_payment",
  "spam_or_bulk_signups",
  "security_risk",
  "legal_request",
  "ban_evasion",
  "other_policy",
] as const;
export type RestrictionCategory = (typeof RESTRICTION_CATEGORIES)[number];

/** `GET /me/restriction` (DESK spec 9.4): what the person may see, never the internal note. */
export type Restriction =
  | { restricted: false }
  | {
      restricted: true;
      kind: "SUSPEND" | "BAN";
      category: RestrictionCategory | string;
      until: string | null;
      appealAvailableAt: string;
      appeal: {
        code: string;
        status: "OPEN" | "UPHELD" | "OVERTURNED";
        submittedAt: string;
        dueAt: string;
      } | null;
    };

/** Null when there is no session or manar-api did not answer. */
export const getRestriction = cache(async (): Promise<Restriction | null> => {
  const session = await getSession();
  const token = session ? freshAccessToken(session) : null;
  if (!token) return null;
  try {
    const res = await fetch(new URL("/me/restriction", env.MANAR_API_BASE_URL), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as Restriction) : null;
  } catch {
    return null;
  }
});
