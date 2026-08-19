"use client";

import { useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { SirenIcon } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { EmptyState } from "@/components/manar/empty-state";
import { IncidentSeverityBadge } from "@/components/manar/incidents/incident-severity-badge";
import { IncidentStatusBadge } from "@/components/manar/incidents/incident-status-badge";
import { CreateIncidentDialog } from "@/components/manar/incidents/create-incident-dialog";
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
import {
  useIncidentsList,
  type Incident,
  type IncidentSeverity,
  type IncidentStatus,
} from "@/hooks/use-incidents";
import { apiErrorMessage } from "@/lib/api/errors";

const SEVERITIES: IncidentSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES: IncidentStatus[] = ["OPEN", "INVESTIGATING", "RESOLVED", "CLOSED"];

const columnHelper = createManarColumnHelper<Incident>();

export function IncidentsListView() {
  const t = useTranslations("incidents");
  const tCommon = useTranslations("common.actions");
  const format = useFormatter();
  const router = useRouter();

  const [status, setStatus] = useState<IncidentStatus | "ALL">("ALL");
  const [severity, setSeverity] = useState<IncidentSeverity | "ALL">("ALL");

  const query = useIncidentsList({
    status: status === "ALL" ? undefined : status,
    severity: severity === "ALL" ? undefined : severity,
  });
  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  const columns: ManarColumnDef<Incident, unknown>[] = [
    columnHelper.accessor("title", {
      header: t("columns.title"),
      cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
    }) as ManarColumnDef<Incident, unknown>,
    columnHelper.accessor("severity", {
      header: t("columns.severity"),
      cell: (info) => <IncidentSeverityBadge severity={info.getValue()} />,
    }) as ManarColumnDef<Incident, unknown>,
    columnHelper.accessor("status", {
      header: t("columns.status"),
      cell: (info) => <IncidentStatusBadge status={info.getValue()} />,
    }) as ManarColumnDef<Incident, unknown>,
    columnHelper.accessor("relatedCorrelationIds", {
      header: t("columns.linkedEvents"),
      cell: (info) => (
        <span className="text-xs text-muted-foreground tabular-nums">{info.getValue().length}</span>
      ),
    }) as ManarColumnDef<Incident, unknown>,
    columnHelper.accessor("createdAt", {
      header: t("columns.createdAt"),
      cell: (info) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {format.dateTime(new Date(info.getValue()), { dateStyle: "medium", timeStyle: "short" })}
        </span>
      ),
    }) as ManarColumnDef<Incident, unknown>,
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={<CreateIncidentDialog />}
      />

      <div className="flex items-center gap-2">
        <Select
          value={status}
          onValueChange={(value) => setStatus((value as typeof status) ?? "ALL")}
        >
          <SelectTrigger className="w-44" aria-label={t("filters.statusLabel")}>
            <SelectValue placeholder={t("filters.statusLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filters.allStatuses")}</SelectItem>
            {STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`status.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={severity}
          onValueChange={(value) => setSeverity((value as typeof severity) ?? "ALL")}
        >
          <SelectTrigger className="w-44" aria-label={t("filters.severityLabel")}>
            <SelectValue placeholder={t("filters.severityLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filters.allSeverities")}</SelectItem>
            {SEVERITIES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`severity.${value}`)}
              </SelectItem>
            ))}
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
      ) : items.length === 0 && status === "ALL" && severity === "ALL" ? (
        <EmptyState icon={SirenIcon} description={t("empty")} action={<CreateIncidentDialog />} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={items}
            onRowClick={(row) => router.push(`/incidents/${row.id}`)}
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
