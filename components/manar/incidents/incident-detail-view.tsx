"use client";

import { useTranslations, useFormatter } from "next-intl";
import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { NotFoundPanel } from "@/components/manar/not-found-panel";
import { IncidentSeverityBadge } from "@/components/manar/incidents/incident-severity-badge";
import { IncidentStatusBadge } from "@/components/manar/incidents/incident-status-badge";
import { IncidentStatusTransition } from "@/components/manar/incidents/incident-status-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { useIncidentAuditTrail, useIncidentDetail } from "@/hooks/use-incidents";

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

export function IncidentDetailView({ incidentId }: { incidentId: string }) {
  const t = useTranslations("incidents.detail");
  const tIncidents = useTranslations("incidents");
  const format = useFormatter();
  const { data: incident, isPending, isError } = useIncidentDetail(incidentId);
  const trail = useIncidentAuditTrail(incident?.relatedCorrelationIds ?? []);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !incident) {
    return <NotFoundPanel title={tIncidents("title")} body={t("notFoundBody")} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={incident.title}
        description={t("createdOn", {
          date: format.dateTime(new Date(incident.createdAt), {
            dateStyle: "medium",
            timeStyle: "short",
          }),
        })}
        actions={
          <div className="flex items-center gap-2">
            <IncidentSeverityBadge severity={incident.severity} />
            <IncidentStatusBadge status={incident.status} />
          </div>
        }
      />

      <Link href="/incidents" className="text-xs text-muted-foreground hover:text-foreground">
        ← {t("backToList")}
      </Link>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("overviewTitle")}</h2>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">{t("description")}</span>
          <p className="text-sm whitespace-pre-wrap text-foreground">{incident.description}</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field
            label={t("createdAt")}
            value={format.dateTime(new Date(incident.createdAt), {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          />
          <Field
            label={t("resolvedAt")}
            value={
              incident.resolvedAt
                ? format.dateTime(new Date(incident.resolvedAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : t("notResolved")
            }
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("lifecycleTitle")}</h2>
        <IncidentStatusTransition incidentId={incident.id} status={incident.status} />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">{t("auditTrailTitle")}</h2>
        <p className="mb-3 text-xs text-muted-foreground">{t("auditTrailHint")}</p>

        {incident.relatedCorrelationIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("auditTrailNoCorrelationIds")}</p>
        ) : trail.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : trail.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("auditTrailEmpty")}</p>
        ) : (
          <ol className="flex flex-col gap-2 border-s-2 border-border ps-4">
            {trail.data.map((event) => (
              <li key={event.eventId} className="relative">
                <span className="absolute -start-[21px] top-1.5 size-2 rounded-full bg-primary" />
                <Link
                  href={`/audit/${event.eventId}`}
                  className="font-mono text-xs text-primary hover:underline"
                >
                  {event.eventType}
                </Link>
                <span className="ms-2 text-xs text-muted-foreground tabular-nums">
                  {format.dateTime(new Date(event.timestamp), {
                    dateStyle: "short",
                    timeStyle: "medium",
                  })}
                </span>
              </li>
            ))}
          </ol>
        )}

        {incident.relatedCorrelationIds.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {incident.relatedCorrelationIds.map((id) => (
              <span
                key={id}
                className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
              >
                {id}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
