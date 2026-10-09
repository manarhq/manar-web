"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { PlugIcon } from "@phosphor-icons/react/ssr";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { EmptyState } from "@/components/manar/empty-state";
import { StatusBadge } from "@/components/manar/status-badge";
import { DemoFixtureBadge } from "@/components/manar/demo-fixture-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAllToolsForPicker, type ToolSummary } from "@/hooks/use-tools";
import { apiErrorMessage } from "@/lib/api/errors";

/**
 * `/integrations` — Phase 15b (Section 60). Deliberately the exact same
 * `GET /tools` data `/tools` (Phase 11b) already lists, through a
 * different lens: grouped by integration type instead of one flat table,
 * with enabled/disabled status as the primary visual signal instead of a
 * table column. No separate `Integration` model or endpoint exists —
 * every `Tool` row already IS an integration (see manar-api's Phase 15a
 * design doc, "`/integrations` — no new backend needed").
 */
function groupByType(tools: ToolSummary[]): Map<string, ToolSummary[]> {
  const groups = new Map<string, ToolSummary[]>();
  for (const tool of tools) {
    const key = tool.type;
    const existing = groups.get(key);
    if (existing) {
      existing.push(tool);
    } else {
      groups.set(key, [tool]);
    }
  }
  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export function IntegrationsView() {
  const t = useTranslations("integrations");
  const tTools = useTranslations("tools");
  const tCommon = useTranslations("common.actions");
  const query = useAllToolsForPicker();

  const tools = useMemo(() => query.data ?? [], [query.data]);
  const grouped = useMemo(() => groupByType(tools), [tools]);
  const enabledCount = tools.filter((tool) => tool.enabled).length;
  const disabledCount = tools.length - enabledCount;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />

      {query.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : query.isError ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <span>{t("loadError")}</span>
          <span className="text-xs">{apiErrorMessage(query.error)}</span>
          <Button size="xs" variant="outline" onClick={() => query.refetch()}>
            {tCommon("retry")}
          </Button>
        </div>
      ) : tools.length === 0 ? (
        <EmptyState icon={PlugIcon} description={t("empty")} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{t("summary.total", { count: tools.length })}</span>
            <span aria-hidden>·</span>
            <span>{t("summary.enabled", { count: enabledCount })}</span>
            <span aria-hidden>·</span>
            <span className="text-muted-foreground">
              {t("summary.disabled", { count: disabledCount })}
            </span>
          </div>

          <div className="flex flex-col gap-5">
            {[...grouped.entries()].map(([type, groupTools]) => (
              <section key={type} className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold text-muted-foreground">
                  {type}
                  <span className="ms-1.5 font-normal normal-case text-muted-foreground/70">
                    ({groupTools.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {groupTools.map((tool) => (
                    <Link
                      key={tool.id}
                      href={`/tools/${tool.id}`}
                      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-subtle"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          {tool.name}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <DemoFixtureBadge tool={tool} />
                          <StatusBadge tone={tool.enabled ? "info" : "neutral"}>
                            {tool.enabled ? tTools("status.enabled") : tTools("status.disabled")}
                          </StatusBadge>
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{tool.vendor ?? tTools("detail.noVendor")}</span>
                        <span className="font-mono">{tool.protocol}</span>
                        <span>{t("actionsCount", { count: tool.actions.length })}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
