import "server-only";

import { env } from "@/lib/env";
import type { SharedSession } from "@/lib/insight/types";
import { STEP_KINDS } from "@/lib/insight/types";
import type { ReportCardApi } from "@/lib/personal/report";

export const SHARE_ID = /^[A-Za-z0-9_-]{32}$/;

/** The public totals for a share link, or null when the link is unknown or revoked. */
export async function fetchPublicReport(
  shareId: string,
): Promise<(ReportCardApi & { session?: SharedSession }) | null> {
  if (!SHARE_ID.test(shareId)) return null;
  const res = await fetch(`${env.MANAR_API_BASE_URL}/public/report/${shareId}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`report fetch failed: ${res.status}`);
  const d = (await res.json()) as ReportCardApi & { session?: SharedSession };
  // Defence in depth: keep only the totals even if the API ever sent more.
  return {
    from: d.from,
    to: d.to,
    actions: d.actions,
    askedYou: d.askedYou,
    blocked: d.blocked,
    secretsKeptSafe: d.secretsKeptSafe,
    series: d.series,
    session: cleanSession(d.session),
  };
}

const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : 0);

/** Keeps only the redacted fields of a shared session, whatever the API sent. */
function cleanSession(s: SharedSession | undefined): SharedSession | undefined {
  if (!s || !Array.isArray(s.steps)) return undefined;
  const c = s.counts ?? ({} as SharedSession["counts"]);
  return {
    tool: String(s.tool ?? "").slice(0, 60),
    source: s.source === "hook" ? "hook" : "gap",
    startedAt: String(s.startedAt ?? ""),
    durationSeconds: num(s.durationSeconds),
    counts: {
      commands: num(c.commands),
      files: num(c.files),
      sites: num(c.sites),
      tools: num(c.tools),
      approvals: num(c.approvals),
      secrets: num(c.secrets),
      blocked: num(c.blocked),
    },
    steps: s.steps
      .filter((x) => STEP_KINDS.includes(x.kind))
      .slice(0, 1000)
      .map((x) => ({
        t: num(x.t),
        kind: x.kind,
        text: String(x.text ?? "").slice(0, 100),
        ...(x.decision === "ALLOW" || x.decision === "DENY" || x.decision === "APPROVAL_REQUIRED"
          ? { decision: x.decision }
          : {}),
      })),
  };
}
