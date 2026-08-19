"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { InfoIcon } from "lucide-react";

import { PageHeader } from "@/components/manar/page-header";
import { ComplianceStatusBadge } from "@/components/manar/compliance/compliance-status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useComplianceControls, useComplianceFrameworks } from "@/hooks/use-compliance";
import { apiErrorMessage } from "@/lib/api/errors";

function ControlsPanel({ frameworkId }: { frameworkId: string }) {
  const t = useTranslations("compliance");
  const tCommon = useTranslations("common.actions");
  const format = useFormatter();
  const query = useComplianceControls(frameworkId);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <span>{t("loadError")}</span>
        <span className="text-xs">{apiErrorMessage(query.error)}</span>
        <Button size="xs" variant="outline" onClick={() => query.refetch()}>
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  const controls = query.data ?? [];

  if (controls.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {controls.map((control) => (
        <article key={control.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{control.controlId}</span>
                <h3 className="text-sm font-semibold text-foreground">{control.title}</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{control.description}</p>
            </div>
            {control.mapping ? (
              <ComplianceStatusBadge status={control.mapping.status} />
            ) : (
              <span className="text-xs text-muted-foreground">{t("noMapping")}</span>
            )}
          </div>

          {control.mapping && (
            <div className="mt-3 flex flex-col gap-2 rounded-md border border-border/70 bg-muted/30 p-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t("evidenceLabel")}
                </span>
                <p className="text-sm whitespace-pre-wrap text-foreground">
                  {control.mapping.evidenceDescription}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {control.mapping.evidenceReference && (
                  <span>
                    {t("evidenceReferenceLabel")}:{" "}
                    <span className="font-mono">{control.mapping.evidenceReference}</span>
                  </span>
                )}
                <span>
                  {t("assessedAtLabel")}:{" "}
                  {format.dateTime(new Date(control.mapping.assessedAt), { dateStyle: "medium" })}
                </span>
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

export function ComplianceView() {
  const t = useTranslations("compliance");
  const tCommon = useTranslations("common.actions");
  const frameworksQuery = useComplianceFrameworks();
  const [activeFrameworkId, setActiveFrameworkId] = useState<string | undefined>(undefined);

  const frameworks = frameworksQuery.data ?? [];
  const currentFrameworkId = activeFrameworkId ?? frameworks[0]?.id;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>{t("honestyNotice")}</p>
      </div>

      {frameworksQuery.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : frameworksQuery.isError ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <span>{t("frameworksLoadError")}</span>
          <span className="text-xs">{apiErrorMessage(frameworksQuery.error)}</span>
          <Button size="xs" variant="outline" onClick={() => frameworksQuery.refetch()}>
            {tCommon("retry")}
          </Button>
        </div>
      ) : frameworks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("frameworksEmpty")}</p>
      ) : (
        <Tabs
          value={currentFrameworkId}
          onValueChange={(value) => setActiveFrameworkId(value as string)}
        >
          <TabsList>
            {frameworks.map((framework) => (
              <TabsTrigger key={framework.id} value={framework.id}>
                {framework.name}
                <span className="ms-1.5 text-xs text-muted-foreground">{framework.version}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {frameworks.map((framework) => (
            <TabsContent key={framework.id} value={framework.id} className="mt-3">
              <ControlsPanel frameworkId={framework.id} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
