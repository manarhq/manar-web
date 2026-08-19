"use client";

import { useMemo } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { ShieldIcon } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { EmptyState } from "@/components/manar/empty-state";
import { CreatePolicyDialog } from "@/components/manar/policies/create-policy-dialog";
import { SuggestPolicyDialog } from "@/components/manar/policies/suggest-policy-dialog";
import { PolicyVersionStatusBadge } from "@/components/manar/policies/policy-status-badge";
import {
  DataTable,
  createManarColumnHelper,
  type ManarColumnDef,
} from "@/components/manar/data-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePoliciesList, type PolicySummary } from "@/hooks/use-policies";
import { apiErrorMessage } from "@/lib/api/errors";

const columnHelper = createManarColumnHelper<PolicySummary>();

export function PoliciesListView() {
  const t = useTranslations("policies");
  const tCommon = useTranslations("common.actions");
  const format = useFormatter();
  const router = useRouter();

  const query = usePoliciesList();
  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  const columns: ManarColumnDef<PolicySummary, unknown>[] = [
    columnHelper.accessor("name", {
      header: t("columns.name"),
      cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
    }) as ManarColumnDef<PolicySummary, unknown>,
    columnHelper.accessor("currentVersion", {
      header: t("columns.currentVersion"),
      cell: (info) => {
        const version = info.getValue();
        return version ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-xs">v{version.version}</span>
            <PolicyVersionStatusBadge status={version.status} />
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{t("noPublishedVersion")}</span>
        );
      },
    }) as ManarColumnDef<PolicySummary, unknown>,
    columnHelper.accessor("createdAt", {
      header: t("columns.createdAt"),
      cell: (info) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {format.dateTime(new Date(info.getValue()), { dateStyle: "medium", timeStyle: "short" })}
        </span>
      ),
    }) as ManarColumnDef<PolicySummary, unknown>,
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex items-center gap-2">
            <SuggestPolicyDialog policies={items} />
            <CreatePolicyDialog />
          </div>
        }
      />

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
      ) : items.length === 0 ? (
        <EmptyState icon={ShieldIcon} description={t("empty")} action={<CreatePolicyDialog />} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={items}
            onRowClick={(row) => router.push(`/policies/${row.id}`)}
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
