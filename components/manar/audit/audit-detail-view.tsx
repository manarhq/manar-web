"use client";

import { useTranslations, useFormatter } from "next-intl";
import { ArrowLeftIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { NotFoundPanel } from "@/components/manar/not-found-panel";
import { RiskBadge } from "@/components/manar/risk-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditEventDetail, useCorrelatedEvents } from "@/hooks/use-audit";
import { useActorNameResolver } from "@/hooks/use-actor-name";
import { humanizeEventType } from "@/lib/humanize-event-type";
import { isKnownAuditDecision } from "@/lib/audit-decision";

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

export function AuditDetailView({ eventId }: { eventId: string }) {
  const t = useTranslations("audit.detail");
  const tAudit = useTranslations("audit");
  const format = useFormatter();
  const { data: event, isPending, isError } = useAuditEventDetail(eventId);
  const correlated = useCorrelatedEvents(event?.correlationId);
  const resolveActorName = useActorNameResolver();

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !event) {
    return <NotFoundPanel title={tAudit("title")} body={t("notFoundBody")} />;
  }

  const actor = event.actor as unknown as { type: string; id: string };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={<span title={event.eventType}>{humanizeEventType(event.eventType)}</span>}
        description={event.eventId}
      />

      <Link
        href="/audit"
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5 rtl:rotate-180" aria-hidden />
        {t("backToList")}
      </Link>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("overviewTitle")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field
            label={t("timestamp")}
            value={format.dateTime(new Date(event.timestamp), {
              dateStyle: "medium",
              timeStyle: "medium",
            })}
          />
          <Field
            label={t("actor")}
            value={<span title={`${actor?.type} · ${actor?.id}`}>{resolveActorName(actor)}</span>}
          />
          <Field
            label={t("correlationId")}
            value={<span className="font-mono text-xs">{event.correlationId}</span>}
          />
          {event.agentId && (
            <Field
              label={t("agentId")}
              value={
                <Link href={`/agents/${event.agentId}`} className="text-primary hover:underline">
                  {event.agentId}
                </Link>
              }
            />
          )}
          {event.taskId && (
            <Field
              label={t("taskId")}
              value={
                <Link href={`/tasks/${event.taskId}`} className="text-primary hover:underline">
                  {event.taskId}
                </Link>
              }
            />
          )}
          {event.toolId && <Field label={t("toolId")} value={event.toolId} />}
          {event.actionId && <Field label={t("actionId")} value={event.actionId} />}
          {event.decision &&
            (() => {
              const decision = event.decision;
              return (
                <Field
                  label={t("decision")}
                  value={
                    isKnownAuditDecision(decision) ? tAudit(`decisions.${decision}`) : decision
                  }
                />
              );
            })()}
          {typeof event.riskScore === "number" && (
            <Field label={t("riskScore")} value={<RiskBadge score={event.riskScore} />} />
          )}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field
            label={t("eventHash")}
            value={<span className="font-mono text-xs break-all">{event.eventHash}</span>}
          />
          <Field
            label={t("previousHash")}
            value={
              event.previousHash ? (
                <span className="font-mono text-xs break-all">{event.previousHash}</span>
              ) : (
                t("noPreviousHash")
              )
            }
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("dataTitle")}</h2>
        {/* Forced LTR regardless of page locale: this is a raw JSON dump
         * (the audit trail's evidence data -- design-rework.md frames
         * this as "legal artifacts, not dashboards"), not prose. Under
         * dir="rtl" the browser's bidi algorithm reorders this block's
         * lines (the closing brace visually floats to the top), which
         * is wrong for structured/numeric data -- standard practice is
         * to pin code/data blocks LTR independent of the surrounding
         * document direction, the same way IDs/hashes elsewhere on this
         * page already render as plain LTR text. */}
        <pre
          dir="ltr"
          className="max-h-96 overflow-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs"
        >
          {JSON.stringify(event.data, null, 2)}
        </pre>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">{t("timelineTitle")}</h2>
        <p className="mb-3 text-xs text-muted-foreground">{t("timelineHint")}</p>

        {correlated.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : (correlated.data?.length ?? 0) <= 1 ? (
          <p className="text-sm text-muted-foreground">{t("timelineEmpty")}</p>
        ) : (
          <ol className="flex flex-col gap-2 border-s-2 border-border ps-4">
            {correlated.data!.map((item) => (
              <li key={item.eventId} className="relative">
                <span className="absolute -start-[21px] top-1.5 size-2 rounded-full bg-primary" />
                <Link
                  href={`/audit/${item.eventId}`}
                  title={item.eventType}
                  className={
                    item.eventId === event.eventId
                      ? "font-semibold text-foreground"
                      : "text-primary hover:underline"
                  }
                >
                  {humanizeEventType(item.eventType)}
                </Link>
                <span className="ms-2 text-xs text-muted-foreground tabular-nums">
                  {format.dateTime(new Date(item.timestamp), {
                    dateStyle: "short",
                    timeStyle: "medium",
                  })}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
