import "server-only";

import { env } from "@/lib/env";
import type { ReportCardApi } from "@/lib/personal/report";

export const SHARE_ID = /^[A-Za-z0-9_-]{32}$/;

/** The public totals for a share link, or null when the link is unknown or revoked. */
export async function fetchPublicReport(shareId: string): Promise<ReportCardApi | null> {
  if (!SHARE_ID.test(shareId)) return null;
  const res = await fetch(`${env.MANAR_API_BASE_URL}/public/report/${shareId}`, {
    next: { revalidate: 60 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`report fetch failed: ${res.status}`);
  const d = (await res.json()) as ReportCardApi;
  // Defence in depth: keep only the totals even if the API ever sent more.
  return {
    from: d.from,
    to: d.to,
    actions: d.actions,
    askedYou: d.askedYou,
    blocked: d.blocked,
    secretsKeptSafe: d.secretsKeptSafe,
    series: d.series,
  };
}
