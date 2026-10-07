"use client";

import { useTranslations, useFormatter } from "next-intl";
import { ArrowLeftIcon, InfoIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { NotFoundPanel } from "@/components/manar/not-found-panel";
import { ApiErrorPanel } from "@/components/manar/api-error-state";
import { isNotFoundError } from "@/lib/api/errors";
import { StatusBadge } from "@/components/manar/status-badge";
import { DemoFixtureBadge } from "@/components/manar/demo-fixture-badge";
import { RiskBadge } from "@/components/manar/risk-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToolDetail } from "@/hooks/use-tools";

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

export function ToolDetailView({ toolId }: { toolId: string }) {
  const t = useTranslations("tools.detail");
  const tTools = useTranslations("tools");
  const format = useFormatter();
  const { data: tool, isPending, isError, error } = useToolDetail(toolId);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError && !isNotFoundError(error)) {
    return <ApiErrorPanel title={tTools("title")} error={error} />;
  }
  if (isError || !tool) {
    return <NotFoundPanel title={tTools("title")} body={t("notFoundBody")} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={tool.name}
        description={tool.baseEndpoint}
        actions={
          <span className="flex items-center gap-2">
            <DemoFixtureBadge tool={tool} />
            <StatusBadge tone={tool.enabled ? "info" : "neutral"}>
              {tool.enabled ? tTools("status.enabled") : tTools("status.disabled")}
            </StatusBadge>
          </span>
        }
      />

      <Link
        href="/tools"
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5 rtl:rotate-180" aria-hidden />
        {t("backToList")}
      </Link>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("overviewTitle")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label={t("type")} value={tool.type} />
          <Field label={t("vendor")} value={tool.vendor ?? t("noVendor")} />
          <Field label={t("protocol")} value={<span className="font-mono">{tool.protocol}</span>} />
          <Field
            label={t("createdAt")}
            value={format.dateTime(new Date(tool.createdAt), {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          />
        </div>
        <div className="mt-4 flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">{t("description")}</span>
          <p className="text-sm text-foreground">{tool.description ?? t("noDescription")}</p>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("actionsTitle")}</h2>
        {tool.actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("actionsEmpty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs text-muted-foreground">
                  <th className="px-2 py-1.5 text-start font-medium">{t("actionColumns.name")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t("actionColumns.risk")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">
                    {t("actionColumns.mutating")}
                  </th>
                  <th className="px-2 py-1.5 text-start font-medium">
                    {t("actionColumns.destructive")}
                  </th>
                  <th className="px-2 py-1.5 text-start font-medium">
                    {t("actionColumns.approvalDefault")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tool.actions.map((action) => (
                  <tr key={action.id} className="border-b border-border last:border-0">
                    <td className="px-2 py-1.5 font-mono text-xs">{action.name}</td>
                    <td className="px-2 py-1.5">
                      <RiskBadge score={action.riskBaseScore} />
                    </td>
                    <td className="px-2 py-1.5">
                      {action.mutating ? (
                        <Badge variant="outline">✓</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {action.destructive ? (
                        <Badge variant="destructive">✓</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {action.approvalDefault ? (
                        <Badge variant="secondary">✓</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-dashed border-border p-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <InfoIcon className="size-4 text-muted-foreground" aria-hidden />
        </h2>
        <p className="text-sm text-muted-foreground">{t("readOnlyNote")}</p>
      </section>
    </div>
  );
}
