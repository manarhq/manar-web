"use client";

import { useFormatter, useTranslations } from "next-intl";
import { ShieldCheckIcon, ShieldWarningIcon } from "@phosphor-icons/react/ssr";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useAuditVerifyChain } from "@/hooks/use-audit";
import { apiErrorMessage } from "@/lib/api/errors";
import { auditBadgeState, coveredFrom, lastFullVerifiedAt } from "@/lib/audit-verify";

/** Wired to the real `GET /audit/verify` (the same endpoint Phase 11a's
 * /overview tile already proved out) — recomputes every event's hash and
 * chain linkage server-side. */
export function ChainVerifyButton() {
  const t = useTranslations("audit.verify");
  const format = useFormatter();
  const verify = useAuditVerifyChain();
  const state = verify.data ? auditBadgeState(verify.data) : null;
  const since = coveredFrom(verify.data);
  const full = lastFullVerifiedAt(verify.data);
  const when = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => verify.refetch()}
        disabled={verify.isFetching}
      >
        {verify.isFetching ? (
          t("checking")
        ) : (
          <>
            {state === "broken" ? <ShieldWarningIcon className="text-deny" /> : <ShieldCheckIcon />}
            {t("button")}
          </>
        )}
      </Button>
      {verify.isError && (
        <span className="text-xs text-destructive">{apiErrorMessage(verify.error)}</span>
      )}
      {verify.data && (
        <span
          className={
            state === "verified"
              ? "text-xs text-allow"
              : state === "broken"
                ? "text-xs text-deny"
                : "text-xs text-wait"
          }
        >
          {state === "verified" ? (
            t("valid")
          ) : state === "recent-only" ? (
            t("recentOnly")
          ) : (
            <>
              {t("broken")}{" "}
              {verify.data.brokenAt && (
                <>
                  {t("brokenAt")}{" "}
                  <Link href={`/audit/${verify.data.brokenAt}`} className="underline">
                    {verify.data.brokenAt}
                  </Link>
                </>
              )}
            </>
          )}
          {state !== "broken" && (
            <span className="block text-muted-foreground">
              {since ? `${t("since", { time: when(since) })} ` : ""}
              {full ? t("lastFull", { time: when(full) }) : t("noFull")}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
