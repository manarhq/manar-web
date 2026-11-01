"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ShareNetworkIcon } from "@phosphor-icons/react/ssr";

import { SourceBadge } from "@/components/manar/insight/sessions-view";
import { ShareReportDialog } from "@/components/manar/features/share-report-dialog";
import { PageHeader } from "@/components/manar/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-insight";
import { Link } from "@/i18n/navigation";
import { STEP_KINDS, type SessionStep } from "@/lib/insight/types";

function Step({ step }: { step: SessionStep }) {
  const t = useTranslations("insight.sessions");
  const format = useFormatter();
  const kind = STEP_KINDS.includes(step.kind) ? step.kind : "tool";
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 border-t border-border py-2 first:border-t-0">
      <time className="text-xs text-muted-foreground tabular-nums" dateTime={step.at}>
        {format.dateTime(new Date(step.at), { timeStyle: "medium" })}
      </time>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{t(`kind.${kind}`)}</span>
          {step.decision && (
            <Badge
              variant={
                step.decision === "ALLOW" ? "allow" : step.decision === "DENY" ? "deny" : "wait"
              }
            >
              {t(`decision.${step.decision}`)}
            </Badge>
          )}
          {step.outcome && (
            <Badge variant={step.outcome === "approved" ? "allow" : "deny"}>
              {t(`outcome.${step.outcome}`)}
            </Badge>
          )}
          {kind === "secret" && step.blocked && <Badge variant="allow">{t("secretBlocked")}</Badge>}
        </p>
        <p className="text-xs break-all text-muted-foreground" dir="auto">
          {step.label}
        </p>
      </div>
    </li>
  );
}

/** One session in order, with a Share as report action. */
export function SessionDetailView({ id }: { id: string }) {
  const t = useTranslations("insight.sessions");
  const format = useFormatter();
  const { data, isLoading, isError } = useSession(id);
  const [sharing, setSharing] = useState(false);
  const minutes = data
    ? Math.round((Date.parse(data.endedAt) - Date.parse(data.startedAt)) / 60_000)
    : 0;
  return (
    <div className="grid gap-5">
      <PageHeader
        title={data ? `${data.toolName}${data.hostname ? ` · ${data.hostname}` : ""}` : t("title")}
        description={
          data
            ? `${t("started", { when: format.dateTime(new Date(data.startedAt), { dateStyle: "medium", timeStyle: "short" }) })} · ${t("duration", { minutes })}`
            : undefined
        }
        actions={
          data && (
            <Button variant="outline" onClick={() => setSharing(true)}>
              <ShareNetworkIcon aria-hidden />
              {t("share")}
            </Button>
          )
        }
      />
      <Link href={"/sessions" as never} className="text-sm text-blue-text hover:underline">
        {t("back")}
      </Link>
      {isLoading ? (
        <Skeleton className="h-24 w-full" aria-busy />
      ) : isError || !data ? (
        <p role="alert" className="text-sm text-deny">
          {t("notFound")}
        </p>
      ) : (
        <section className="grid gap-2 rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={data.source} />
            <span className="text-xs text-muted-foreground">
              {t("steps", { count: data.steps.length })}
            </span>
          </div>
          {data.source === "gap" && (
            <p className="text-xs text-muted-foreground">{t("sourceGapHint")}</p>
          )}
          <h2 className="sr-only">{t("timeline")}</h2>
          <ol>
            {data.steps.map((s, i) => (
              <Step key={`${s.at}-${i}`} step={s} />
            ))}
          </ol>
        </section>
      )}
      <ShareReportDialog open={sharing} onOpenChange={setSharing} sessionId={id} />
    </div>
  );
}
