"use client";

import { useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { ClipboardCheckIcon } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { EmptyState } from "@/components/manar/empty-state";
import { ApprovalStatusBadge } from "@/components/manar/approvals/approval-status-badge";
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
import { useApprovalsList, type ApprovalStatus, type ApprovalSummary } from "@/hooks/use-approvals";
import { useAgentsList } from "@/hooks/use-agents";
import { useAllToolsForPicker } from "@/hooks/use-tools";
import {
  ActionCategoryBadge,
  actionCategory,
  type ActionCategory,
} from "@/components/manar/action-category-badge";
import { apiErrorMessage } from "@/lib/api/errors";

const STATUSES: ApprovalStatus[] = ["PENDING", "APPROVED", "DENIED", "EXPIRED"];

const columnHelper = createManarColumnHelper<ApprovalSummary>();

export function ApprovalsListView() {
  const t = useTranslations("approvals");
  const tCommon = useTranslations("common.actions");
  const format = useFormatter();
  const router = useRouter();
  const [status, setStatus] = useState<ApprovalStatus | "ALL">("PENDING");

  const query = useApprovalsList({ status: status === "ALL" ? undefined : status });
  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  // Best-effort agent-name lookup, same "one generous page" pattern
  // hooks/use-actor-name.ts and tasks-list-view.tsx already use.
  const agentsQuery = useAgentsList();
  const agentsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const agent of agentsQuery.data?.pages.flatMap((p) => p.items) ?? []) {
      map.set(agent.id, agent.displayName);
    }
    return map;
  }, [agentsQuery.data]);

  // Tool and action names plus the read/change/destructive category come
  // from the tool registry (one page, same best-effort pattern). An action
  // not on that page shows its raw ID and an "unknown" category.
  const toolsQuery = useAllToolsForPicker();
  const { toolNames, actions } = useMemo(() => {
    const toolNames = new Map<string, string>();
    const actions = new Map<string, { name: string; category: ActionCategory }>();
    for (const tool of toolsQuery.data ?? []) {
      toolNames.set(tool.id, tool.name);
      for (const action of tool.actions) {
        actions.set(action.id, { name: action.name, category: actionCategory(action) });
      }
    }
    return { toolNames, actions };
  }, [toolsQuery.data]);

  const columns: ManarColumnDef<ApprovalSummary, unknown>[] = [
    columnHelper.accessor("requestedAt", {
      header: t("columns.requested"),
      cell: (info) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {format.dateTime(new Date(info.getValue()), { dateStyle: "medium", timeStyle: "short" })}
        </span>
      ),
    }) as ManarColumnDef<ApprovalSummary, unknown>,
    columnHelper.accessor("agentId", {
      header: t("columns.agent"),
      cell: (info) => (
        <span className="text-xs text-foreground" title={info.getValue()}>
          {agentsById.get(info.getValue()) ?? info.getValue()}
        </span>
      ),
    }) as ManarColumnDef<ApprovalSummary, unknown>,
    columnHelper.accessor("toolId", {
      header: t("columns.tool"),
      cell: (info) => (
        <span className="font-mono text-xs" title={info.getValue()}>
          {toolNames.get(info.getValue()) ?? info.getValue()}
        </span>
      ),
    }) as ManarColumnDef<ApprovalSummary, unknown>,
    columnHelper.accessor("actionId", {
      header: t("columns.action"),
      cell: (info) => (
        <span className="font-mono text-xs" title={info.getValue()}>
          {actions.get(info.getValue())?.name ?? info.getValue()}
        </span>
      ),
    }) as ManarColumnDef<ApprovalSummary, unknown>,
    columnHelper.display({
      id: "category",
      header: t("columns.category"),
      cell: (info) => (
        <ActionCategoryBadge
          category={actions.get(info.row.original.actionId)?.category ?? "unknown"}
        />
      ),
    }) as ManarColumnDef<ApprovalSummary, unknown>,
    columnHelper.accessor("riskScore", {
      header: t("columns.risk"),
      cell: (info) => <RiskBadge score={info.getValue()} />,
    }) as ManarColumnDef<ApprovalSummary, unknown>,
    columnHelper.accessor("status", {
      header: t("columns.status"),
      cell: (info) => <ApprovalStatusBadge status={info.getValue()} />,
    }) as ManarColumnDef<ApprovalSummary, unknown>,
    columnHelper.accessor("expiresAt", {
      header: t("columns.expires"),
      cell: (info) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {format.dateTime(new Date(info.getValue()), { dateStyle: "medium", timeStyle: "short" })}
        </span>
      ),
    }) as ManarColumnDef<ApprovalSummary, unknown>,
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="flex items-center gap-2">
        <Select
          value={status}
          onValueChange={(value) => setStatus((value as ApprovalStatus | "ALL") ?? "ALL")}
        >
          <SelectTrigger className="w-52" aria-label={t("filters.statusLabel")}>
            {/* Base UI's SelectValue shows the raw selected value (e.g.
             * "PENDING") unless given a render function — this maps it
             * back to the same sentence-case label its SelectItem uses,
             * matching the fix already applied in agents-list-view.tsx /
             * tasks-list-view.tsx so the trigger never regresses to
             * ALL-CAPS/raw-enum text once something is selected. */}
            <SelectValue placeholder={t("filters.statusLabel")}>
              {(value: ApprovalStatus | "ALL" | null) =>
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
      ) : items.length === 0 && status === "PENDING" ? (
        <EmptyState icon={ClipboardCheckIcon} description={t("emptyPending")} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={items}
            onRowClick={(row) => router.push(`/approvals/${row.id}`)}
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
