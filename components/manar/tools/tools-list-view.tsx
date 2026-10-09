"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { WrenchIcon } from "@phosphor-icons/react/ssr";

import { useRouter } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { EmptyState } from "@/components/manar/empty-state";
import { StatusBadge } from "@/components/manar/status-badge";
import { DemoFixtureBadge } from "@/components/manar/demo-fixture-badge";
import {
  DataTable,
  createManarColumnHelper,
  type ManarColumnDef,
} from "@/components/manar/data-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToolsList, type ToolSummary } from "@/hooks/use-tools";
import { apiErrorMessage } from "@/lib/api/errors";

const columnHelper = createManarColumnHelper<ToolSummary>();

export function ToolsListView() {
  const t = useTranslations("tools");
  const tCommon = useTranslations("common.actions");
  const router = useRouter();
  const [enabled, setEnabled] = useState<"ALL" | "true" | "false">("ALL");

  const query = useToolsList({ enabled: enabled === "ALL" ? undefined : enabled === "true" });
  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  const columns: ManarColumnDef<ToolSummary, unknown>[] = [
    columnHelper.accessor("name", {
      header: t("columns.name"),
      cell: (info) => (
        <span className="flex items-center gap-2">
          <span className="font-medium text-foreground">{info.getValue()}</span>
          <DemoFixtureBadge tool={info.row.original} />
        </span>
      ),
    }) as ManarColumnDef<ToolSummary, unknown>,
    columnHelper.accessor("type", {
      header: t("columns.type"),
      cell: (info) => <span className="text-xs text-muted-foreground">{info.getValue()}</span>,
    }) as ManarColumnDef<ToolSummary, unknown>,
    columnHelper.accessor("protocol", {
      header: t("columns.protocol"),
      cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
    }) as ManarColumnDef<ToolSummary, unknown>,
    columnHelper.accessor("enabled", {
      header: t("columns.status"),
      cell: (info) => (
        <StatusBadge tone={info.getValue() ? "info" : "neutral"}>
          {info.getValue() ? t("status.enabled") : t("status.disabled")}
        </StatusBadge>
      ),
    }) as ManarColumnDef<ToolSummary, unknown>,
    columnHelper.accessor("actions", {
      header: t("columns.actions"),
      cell: (info) => (
        <span className="text-xs text-muted-foreground tabular-nums">{info.getValue().length}</span>
      ),
    }) as ManarColumnDef<ToolSummary, unknown>,
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="flex items-center gap-2">
        <Select
          value={enabled}
          onValueChange={(value) => setEnabled((value as typeof enabled) ?? "ALL")}
        >
          <SelectTrigger className="w-48" aria-label={t("filters.enabledLabel")}>
            {/* See agents-list-view.tsx's identical comment: Base UI's
             * SelectValue shows the raw value ("ALL"/"true") unless mapped
             * back to its sentence-case label here. */}
            <SelectValue placeholder={t("filters.enabledLabel")}>
              {(value: typeof enabled | null) =>
                value
                  ? {
                      ALL: t("filters.all"),
                      true: t("filters.enabledOnly"),
                      false: t("filters.disabledOnly"),
                    }[value]
                  : null
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filters.all")}</SelectItem>
            <SelectItem value="true">{t("filters.enabledOnly")}</SelectItem>
            <SelectItem value="false">{t("filters.disabledOnly")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {query.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : query.isError ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <span>{t("loadError")}</span>
          <span className="text-xs">{apiErrorMessage(query.error)}</span>
          <Button size="xs" variant="outline" onClick={() => query.refetch()}>
            {tCommon("retry")}
          </Button>
        </div>
      ) : items.length === 0 && enabled === "ALL" ? (
        <EmptyState icon={WrenchIcon} description={t("empty")} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={items}
            onRowClick={(row) => router.push(`/tools/${row.id}`)}
            emptyMessage={t("empty")}
            className="max-w-4xl"
          />
          {query.hasNextPage && (
            <Button
              variant="outline"
              size="sm"
              className="self-center"
              onClick={() => query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
            >
              {query.isFetchingNextPage ? "…" : tCommon("loadMore")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
