"use client";

import { useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { BrainCircuitIcon, InfoIcon, LockIcon } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { EmptyState } from "@/components/manar/empty-state";
import { AiSystemLifecycleBadge } from "@/components/manar/ai-systems/ai-system-lifecycle-badge";
import { CreateAiSystemDialog } from "@/components/manar/ai-systems/create-ai-system-dialog";
import { useUserNameResolver, useUserOptions } from "@/components/manar/ai-systems/user-name";
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
  useAiSystemsList,
  type AiSystemEnvironment,
  type AiSystemLifecycleState,
  type AiSystemSummary,
} from "@/hooks/use-ai-systems";
import { apiErrorMessage } from "@/lib/api/errors";

const LIFECYCLE_STATES: AiSystemLifecycleState[] = [
  "DRAFT",
  "REVIEW",
  "ACTIVE",
  "SUSPENDED",
  "RETIRED",
];
const ENVIRONMENTS: AiSystemEnvironment[] = ["DEVELOPMENT", "STAGING", "PRODUCTION"];

const columnHelper = createManarColumnHelper<AiSystemSummary>();

export function AiSystemsListView({ canManage }: { canManage: boolean }) {
  const t = useTranslations("aiSystems");
  const tCommon = useTranslations("common.actions");
  const format = useFormatter();
  const router = useRouter();
  const resolveUserName = useUserNameResolver();
  const users = useUserOptions();

  const [lifecycleState, setLifecycleState] = useState<AiSystemLifecycleState | "ALL">("ALL");
  const [environment, setEnvironment] = useState<AiSystemEnvironment | "ALL">("ALL");
  const [ownerId, setOwnerId] = useState<string>("ALL");

  // Every one of these three is a real query parameter on
  // `GET /ai-systems`, so the filtering happens server-side rather than
  // over whatever pages happen to be loaded. There is deliberately no
  // coverage filter to offer here — see `coverageNotListed` below.
  const query = useAiSystemsList({
    lifecycleState: lifecycleState === "ALL" ? undefined : lifecycleState,
    environment: environment === "ALL" ? undefined : environment,
    ownerId: ownerId === "ALL" ? undefined : ownerId,
  });

  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const filtered = lifecycleState !== "ALL" || environment !== "ALL" || ownerId !== "ALL";

  const columns: ManarColumnDef<AiSystemSummary, unknown>[] = [
    columnHelper.accessor("name", {
      header: t("columns.name"),
      cell: (info) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{info.getValue()}</span>
          <span className="font-data text-2xs text-muted-foreground-tertiary">
            {info.row.original.slug}
          </span>
        </div>
      ),
    }) as ManarColumnDef<AiSystemSummary, unknown>,
    columnHelper.accessor("lifecycleState", {
      header: t("columns.lifecycleState"),
      cell: (info) => <AiSystemLifecycleBadge state={info.getValue()} />,
    }) as ManarColumnDef<AiSystemSummary, unknown>,
    columnHelper.accessor("environment", {
      header: t("columns.environment"),
      cell: (info) => (
        <span className="text-xs text-muted-foreground">{t(`environment.${info.getValue()}`)}</span>
      ),
    }) as ManarColumnDef<AiSystemSummary, unknown>,
    columnHelper.accessor("dataClassification", {
      header: t("columns.dataClassification"),
      cell: (info) => (
        <span className="text-xs text-muted-foreground">
          {t(`dataClassification.${info.getValue()}`)}
        </span>
      ),
    }) as ManarColumnDef<AiSystemSummary, unknown>,
    columnHelper.accessor("ownerId", {
      header: t("columns.owner"),
      cell: (info) => (
        <span className="text-xs text-muted-foreground">{resolveUserName(info.getValue())}</span>
      ),
    }) as ManarColumnDef<AiSystemSummary, unknown>,
    columnHelper.accessor("nextReviewDate", {
      header: t("columns.nextReviewDate"),
      // `null` means UNSCHEDULED, which is a real state and not the same
      // thing as "not due" — so it is labelled, never rendered as an
      // em-dash the way a genuinely absent optional value would be.
      cell: (info) => {
        const value = info.getValue();
        return value ? (
          <span className="font-data text-xs text-muted-foreground">
            {format.dateTime(new Date(value), { dateStyle: "medium" })}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground italic" title={t("unscheduledHint")}>
            {t("unscheduled")}
          </span>
        );
      },
    }) as ManarColumnDef<AiSystemSummary, unknown>,
    columnHelper.accessor("version", {
      header: t("columns.version"),
      cell: (info) => (
        <span className="font-data text-xs text-muted-foreground">v{info.getValue()}</span>
      ),
    }) as ManarColumnDef<AiSystemSummary, unknown>,
    columnHelper.accessor("updatedAt", {
      header: t("columns.updatedAt"),
      cell: (info) => (
        <span className="font-data text-xs text-muted-foreground">
          {format.dateTime(new Date(info.getValue()), { dateStyle: "medium", timeStyle: "short" })}
        </span>
      ),
    }) as ManarColumnDef<AiSystemSummary, unknown>,
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={canManage ? <CreateAiSystemDialog /> : undefined}
      />

      {!canManage && (
        <p className="flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
          <LockIcon className="mt-px size-3.5 shrink-0" aria-hidden />
          {t("readOnlyNotice")}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={lifecycleState}
          onValueChange={(value) => setLifecycleState((value as typeof lifecycleState) ?? "ALL")}
        >
          <SelectTrigger className="w-48" aria-label={t("filters.lifecycleLabel")}>
            {/* Base UI's SelectValue shows the raw selected value unless
             * given a render function — map it back to its translated
             * label instead of leaking the enum into the trigger. */}
            <SelectValue placeholder={t("filters.lifecycleLabel")}>
              {(value: AiSystemLifecycleState | "ALL" | null) =>
                value
                  ? value === "ALL"
                    ? t("filters.allLifecycleStates")
                    : t(`lifecycleState.${value}`)
                  : null
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filters.allLifecycleStates")}</SelectItem>
            {LIFECYCLE_STATES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`lifecycleState.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={environment}
          onValueChange={(value) => setEnvironment((value as typeof environment) ?? "ALL")}
        >
          <SelectTrigger className="w-44" aria-label={t("filters.environmentLabel")}>
            <SelectValue placeholder={t("filters.environmentLabel")}>
              {(value: AiSystemEnvironment | "ALL" | null) =>
                value
                  ? value === "ALL"
                    ? t("filters.allEnvironments")
                    : t(`environment.${value}`)
                  : null
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filters.allEnvironments")}</SelectItem>
            {ENVIRONMENTS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`environment.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ownerId} onValueChange={(value) => setOwnerId((value as string) ?? "ALL")}>
          <SelectTrigger className="w-56" aria-label={t("filters.ownerLabel")}>
            <SelectValue placeholder={t("filters.ownerLabel")}>
              {(value: string | null) =>
                value
                  ? value === "ALL"
                    ? t("filters.allOwners")
                    : (users.find((u) => u.id === value)?.displayName ?? value)
                  : null
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filters.allOwners")}</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* An honest count: it reports what this page has actually loaded,
         * and a trailing "+" when a further cursor page exists — the same
         * discipline hooks/use-attention-counts.ts applies to the sidebar
         * badges rather than implying a tenant total the endpoint never
         * returns. */}
        {!query.isPending && !query.isError && (
          <span
            className="ms-auto font-data text-xs text-muted-foreground"
            title={t("loadedCountHint")}
          >
            {query.hasNextPage
              ? t("loadedCountMore", { count: items.length })
              : t("loadedCount", { count: items.length })}
          </span>
        )}
      </div>

      <p className="flex max-w-prose items-start gap-2 text-xs text-muted-foreground-tertiary">
        <InfoIcon className="mt-px size-3.5 shrink-0" aria-hidden />
        {t("coverageNotListed")}
      </p>

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
      ) : items.length === 0 && !filtered ? (
        <EmptyState
          icon={BrainCircuitIcon}
          description={t("empty")}
          action={canManage ? <CreateAiSystemDialog /> : undefined}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={items}
            onRowClick={(row) => router.push(`/ai-systems/${row.id}`)}
            emptyMessage={t("emptyFiltered")}
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
