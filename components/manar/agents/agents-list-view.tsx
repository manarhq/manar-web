"use client";

import { useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { RobotIcon } from "@phosphor-icons/react/ssr";

import { useRouter } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { EmptyState } from "@/components/manar/empty-state";
import { CreateAgentDialog } from "@/components/manar/agents/create-agent-dialog";
import { AgentStatusBadge } from "@/components/manar/agents/agent-status-badge";
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
import { useAgentsList, type AgentStatus, type AgentSummary } from "@/hooks/use-agents";
import { apiErrorMessage } from "@/lib/api/errors";

const STATUSES: AgentStatus[] = ["PENDING_ENROLLMENT", "ACTIVE", "REVOKED", "KILLED"];

const columnHelper = createManarColumnHelper<AgentSummary>();

export function AgentsListView() {
  const t = useTranslations("agents");
  const tCommon = useTranslations("common.actions");
  const format = useFormatter();
  const router = useRouter();
  const [status, setStatus] = useState<AgentStatus | "ALL">("ALL");

  const query = useAgentsList({ status: status === "ALL" ? undefined : status });
  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  const columns: ManarColumnDef<AgentSummary, unknown>[] = [
    columnHelper.accessor("displayName", {
      header: t("columns.displayName"),
      cell: (info) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{info.getValue()}</span>
          <span className="font-mono text-xs text-muted-foreground">{info.row.original.slug}</span>
        </div>
      ),
    }) as ManarColumnDef<AgentSummary, unknown>,
    columnHelper.accessor("status", {
      header: t("columns.status"),
      cell: (info) => <AgentStatusBadge status={info.getValue()} />,
    }) as ManarColumnDef<AgentSummary, unknown>,
    columnHelper.accessor("createdAt", {
      header: t("columns.created"),
      cell: (info) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {format.dateTime(new Date(info.getValue()), { dateStyle: "medium", timeStyle: "short" })}
        </span>
      ),
    }) as ManarColumnDef<AgentSummary, unknown>,
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={<CreateAgentDialog />}
      />

      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={(value) => setStatus(value as AgentStatus | "ALL")}>
          <SelectTrigger className="w-52" aria-label={t("filters.statusLabel")}>
            {/* Base UI's SelectValue shows the raw selected value (e.g.
             * "ALL"/"PENDING_ENROLLMENT") unless given a render function —
             * this maps it back to the same sentence-case label its
             * SelectItem uses, so the trigger never regresses to
             * ALL-CAPS/raw-enum text once something is actually selected. */}
            <SelectValue placeholder={t("filters.statusLabel")}>
              {(value: AgentStatus | "ALL" | null) =>
                value ? (value === "ALL" ? t("filters.allStatuses") : t(`status.${value}`)) : null
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filters.allStatuses")}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-full" />
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
      ) : items.length === 0 && status === "ALL" ? (
        <EmptyState icon={RobotIcon} description={t("empty")} action={<CreateAgentDialog />} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={items}
            onRowClick={(row) => router.push(`/agents/${row.id}`)}
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
