"use client";

import { useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";

import { useRouter } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { EmptyState } from "@/components/manar/empty-state";
import { RiskBadge } from "@/components/manar/risk-badge";
import { ChainVerifyButton } from "@/components/manar/audit/chain-verify-button";
import { EvidenceExportDialog } from "@/components/manar/audit/evidence-export-dialog";
import { EvidenceVerifyDialog } from "@/components/manar/audit/evidence-verify-dialog";
import { AuditInvestigatePanel } from "@/components/manar/audit/audit-investigate-panel";
import {
  DataTable,
  createManarColumnHelper,
  type ManarColumnDef,
} from "@/components/manar/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditSearch, type AuditEvent, type AuditFilters } from "@/hooks/use-audit";
import { useActorNameResolver } from "@/hooks/use-actor-name";
import { apiErrorMessage } from "@/lib/api/errors";
import { EventTypeLabel } from "@/components/manar/event-type-label";
import { AUDIT_DECISIONS, isKnownAuditDecision } from "@/lib/audit-decision";

const EMPTY_FILTERS: AuditFilters = {};

const columnHelper = createManarColumnHelper<AuditEvent>();

/** `title` overrides the heading where the view is reached under another name (personal Activity). */
export function AuditListView({ title }: { title?: string } = {}) {
  const t = useTranslations("audit");
  const tCommon = useTranslations("common.actions");
  const format = useFormatter();
  const router = useRouter();

  const [draft, setDraft] = useState<AuditFilters>({});
  const [applied, setApplied] = useState<AuditFilters>({});

  const query = useAuditSearch(applied);
  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const resolveActorName = useActorNameResolver();

  const columns: ManarColumnDef<AuditEvent, unknown>[] = [
    columnHelper.accessor("timestamp", {
      header: t("columns.time"),
      cell: (info) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {format.dateTime(new Date(info.getValue()), { dateStyle: "medium", timeStyle: "short" })}
        </span>
      ),
    }) as ManarColumnDef<AuditEvent, unknown>,
    columnHelper.accessor("eventType", {
      header: t("columns.type"),
      cell: (info) => (
        <span className="text-xs">
          <EventTypeLabel event={info.row.original} />
        </span>
      ),
    }) as ManarColumnDef<AuditEvent, unknown>,
    columnHelper.accessor("actor", {
      header: t("columns.actor"),
      cell: (info) => {
        const actor = info.getValue() as unknown as { type: string; id: string };
        return (
          <span className="text-xs text-muted-foreground" title={`${actor?.type} · ${actor?.id}`}>
            {resolveActorName(actor)}
          </span>
        );
      },
    }) as ManarColumnDef<AuditEvent, unknown>,
    columnHelper.accessor("decision", {
      header: t("columns.decision"),
      cell: (info) => {
        const value = info.getValue();
        if (!value) return null;
        return (
          <span className="text-xs text-foreground">
            {isKnownAuditDecision(value) ? t(`decisions.${value}`) : value}
          </span>
        );
      },
    }) as ManarColumnDef<AuditEvent, unknown>,
    columnHelper.accessor("riskScore", {
      header: t("columns.risk"),
      cell: (info) => {
        const value = info.getValue();
        return typeof value === "number" ? <RiskBadge score={value} /> : null;
      },
    }) as ManarColumnDef<AuditEvent, unknown>,
    columnHelper.accessor("correlationId", {
      header: t("columns.correlation"),
      cell: (info) => (
        <span className="font-mono text-xs text-muted-foreground">
          {info.getValue().slice(0, 8)}…
        </span>
      ),
    }) as ManarColumnDef<AuditEvent, unknown>,
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={title ?? t("title")}
        description={t("description")}
        actions={
          <div className="flex items-center gap-2">
            <EvidenceExportDialog />
            <EvidenceVerifyDialog />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <ChainVerifyButton />
      </div>

      <form
        className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 sm:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied(draft);
        }}
      >
        <div className="flex flex-col gap-1">
          <Label htmlFor="audit-eventType" className="text-xs">
            {t("filters.eventType")}
          </Label>
          <Input
            id="audit-eventType"
            value={draft.eventType ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, eventType: e.target.value }))}
            placeholder={t("filters.eventTypePlaceholder")}
            className="h-7 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="audit-correlationId" className="text-xs">
            {t("filters.correlationId")}
          </Label>
          <Input
            id="audit-correlationId"
            value={draft.correlationId ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, correlationId: e.target.value }))}
            className="h-7 font-mono text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="audit-agentId" className="text-xs">
            {t("filters.agentId")}
          </Label>
          <Input
            id="audit-agentId"
            value={draft.agentId ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, agentId: e.target.value }))}
            className="h-7 font-mono text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="audit-taskId" className="text-xs">
            {t("filters.taskId")}
          </Label>
          <Input
            id="audit-taskId"
            value={draft.taskId ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, taskId: e.target.value }))}
            className="h-7 font-mono text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="audit-toolId" className="text-xs">
            {t("filters.toolId")}
          </Label>
          <Input
            id="audit-toolId"
            value={draft.toolId ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, toolId: e.target.value }))}
            className="h-7 font-mono text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="audit-actionId" className="text-xs">
            {t("filters.actionId")}
          </Label>
          <Input
            id="audit-actionId"
            value={draft.actionId ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, actionId: e.target.value }))}
            className="h-7 font-mono text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("filters.decision")}</Label>
          <Select
            value={draft.decision ?? "ANY"}
            onValueChange={(value) =>
              setDraft((d) => ({
                ...d,
                decision: value === "ANY" ? undefined : (value ?? undefined),
              }))
            }
          >
            <SelectTrigger className="h-7 w-full text-xs">
              {/* Same fix as approvals-list-view.tsx's status trigger: Base
               * UI's SelectValue shows the raw selected value ("ANY",
               * "DENY", ...) unless given a render function. */}
              <SelectValue placeholder={t("filters.anyDecision")}>
                {(value: string | null) => {
                  if (!value || value === "ANY") return t("filters.anyDecision");
                  return isKnownAuditDecision(value) ? t(`decisions.${value}`) : value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ANY">{t("filters.anyDecision")}</SelectItem>
              {AUDIT_DECISIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {t(`decisions.${d}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="audit-riskMin" className="text-xs">
              {t("filters.riskMin")}
            </Label>
            <Input
              id="audit-riskMin"
              type="number"
              min={0}
              max={100}
              value={draft.riskMin ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  riskMin: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="h-7 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="audit-riskMax" className="text-xs">
              {t("filters.riskMax")}
            </Label>
            <Input
              id="audit-riskMax"
              type="number"
              min={0}
              max={100}
              value={draft.riskMax ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  riskMax: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="h-7 text-xs"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="audit-from" className="text-xs">
            {t("filters.from")}
          </Label>
          <Input
            id="audit-from"
            type="datetime-local"
            value={draft.from ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
            className="h-7 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="audit-to" className="text-xs">
            {t("filters.to")}
          </Label>
          <Input
            id="audit-to"
            type="datetime-local"
            value={draft.to ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            className="h-7 text-xs"
          />
        </div>
        <div className="col-span-2 flex items-end gap-2 sm:col-span-4">
          <Button type="submit" size="sm">
            {t("filters.apply")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(EMPTY_FILTERS);
              setApplied(EMPTY_FILTERS);
            }}
          >
            {t("filters.clear")}
          </Button>
        </div>
      </form>

      <AuditInvestigatePanel filters={applied} />

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
        <EmptyState icon={MagnifyingGlassIcon} description={t("empty")} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={items}
            onRowClick={(row) => router.push(`/audit/${row.eventId}`)}
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
