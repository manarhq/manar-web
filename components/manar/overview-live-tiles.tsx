"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck, ShieldAlert, Radio, RadioTower } from "lucide-react";

import { StatTile } from "@/components/manar/stat-tile";
import { useAuditVerify } from "@/hooks/use-audit-verify";
import { useLiveEventCount } from "@/hooks/use-live-event-count";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

/**
 * /overview's proof-of-life: two tiles, each exercising a different real
 * path from auth through to rendered UI —
 *  - "Audit chain integrity": generated client + TanStack Query GET
 *  - "Live events (this session)": the SSE feed, which is what actually
 *    moves in response to a real backend write (see
 *    hooks/use-live-event-count.ts's doc comment for why this substitutes
 *    for "active agent count", which isn't an endpoint manar-api exposes
 *    yet).
 */
export function OverviewLiveTiles() {
  const t = useTranslations("overview");
  const auditVerify = useAuditVerify();
  const live = useLiveEventCount();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <StatTile
        label={t("auditIntegrity")}
        value={
          auditVerify.isPending ? (
            <Skeleton className="h-8 w-24" />
          ) : auditVerify.isError ? (
            <span className="text-base font-normal text-destructive">{t("loadError")}</span>
          ) : (
            <span className="inline-flex items-center gap-2">
              {auditVerify.data?.valid ? (
                <ShieldCheck className="size-5 text-risk-minimal" aria-hidden />
              ) : (
                <ShieldAlert className="size-5 text-risk-critical" aria-hidden />
              )}
              {auditVerify.data?.valid ? t("auditVerified") : t("auditBroken")}
            </span>
          )
        }
        hint={t("auditIntegrityHint")}
        accessory={
          auditVerify.isError && (
            <Button variant="ghost" size="xs" onClick={() => auditVerify.refetch()}>
              {t("retry")}
            </Button>
          )
        }
        data-testid="stat-tile-audit-verify"
      />

      <StatTile
        label={t("liveEvents")}
        value={live.count}
        hint={t("liveEventsHint")}
        accessory={
          live.status === "open" ? (
            <RadioTower className="size-3.5 text-risk-minimal" aria-hidden />
          ) : (
            <Radio className="size-3.5 animate-pulse text-muted-foreground" aria-hidden />
          )
        }
        data-testid="stat-tile-live-events"
      />
    </div>
  );
}
