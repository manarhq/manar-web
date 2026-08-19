"use client";

import { useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { CreateTaskDialog } from "@/components/manar/tasks/create-task-dialog";
import { TaskStatusBadge } from "@/components/manar/tasks/task-status-badge";
import { RiskBadge } from "@/components/manar/risk-badge";
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
import { useAgentsList } from "@/hooks/use-agents";
import { useTasksList, type TaskStatus, type TaskSummary } from "@/hooks/use-tasks";
import { apiErrorMessage } from "@/lib/api/errors";

const STATUSES: TaskStatus[] = ["PENDING", "ACTIVE", "EXPIRED", "REVOKED", "COMPLETED"];

const columnHelper = createManarColumnHelper<TaskSummary>();

export function TasksListView() {
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common.actions");
  const format = useFormatter();
  const router = useRouter();
  const [status, setStatus] = useState<TaskStatus | "ALL">("ALL");

  const query = useTasksList({ status: status === "ALL" ? undefined : status });
  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  // Best-effort agent-name lookup for the "assigned agent" column — a
  // single generous page, same as the create-task picker.
  const agentsQuery = useAgentsList();
  const agentsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const agent of agentsQuery.data?.pages.flatMap((p) => p.items) ?? []) {
      map.set(agent.id, agent.displayName);
    }
    return map;
  }, [agentsQuery.data]);

  const columns: ManarColumnDef<TaskSummary, unknown>[] = [
    columnHelper.accessor("name", {
      header: t("columns.name"),
      cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
    }) as ManarColumnDef<TaskSummary, unknown>,
    columnHelper.accessor("assignedAgentId", {
      header: t("columns.assignedAgent"),
      cell: (info) => (
        <span className="font-mono text-xs text-muted-foreground">
          {agentsById.get(info.getValue()) ?? info.getValue()}
        </span>
      ),
    }) as ManarColumnDef<TaskSummary, unknown>,
    columnHelper.accessor("status", {
      header: t("columns.status"),
      cell: (info) => <TaskStatusBadge status={info.getValue()} />,
    }) as ManarColumnDef<TaskSummary, unknown>,
    columnHelper.accessor("riskCeiling", {
      header: t("columns.riskCeiling"),
      cell: (info) => <RiskBadge score={info.getValue()} />,
    }) as ManarColumnDef<TaskSummary, unknown>,
    columnHelper.accessor("expiresAt", {
      header: t("columns.expires"),
      cell: (info) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {format.dateTime(new Date(info.getValue()), { dateStyle: "medium", timeStyle: "short" })}
        </span>
      ),
    }) as ManarColumnDef<TaskSummary, unknown>,
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={<CreateTaskDialog />}
      />

      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus | "ALL")}>
          <SelectTrigger className="w-52" aria-label={t("filters.statusLabel")}>
            <SelectValue placeholder={t("filters.statusLabel")} />
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
      ) : (
        <>
          <DataTable
            columns={columns}
            data={items}
            onRowClick={(row) => router.push(`/tasks/${row.id}`)}
            emptyMessage={t("empty")}
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
