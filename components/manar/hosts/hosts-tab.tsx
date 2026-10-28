"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { DesktopTowerIcon, WarningIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

import { EmptyState } from "@/components/manar/empty-state";
import {
  DataTable,
  createManarColumnHelper,
  type ManarColumnDef,
} from "@/components/manar/data-table";
import { StatusBadge, type StatusTone } from "@/components/manar/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useHostDecision,
  useHostGroups,
  useHostsList,
  type Host,
  type HostDecision,
  type HostStatus,
} from "@/hooks/use-hosts";
import { apiErrorMessage } from "@/lib/api/errors";
import { OptionSelect, QueryBlock, shortFingerprint } from "./shared";

const STATUSES: HostStatus[] = ["PENDING", "APPROVED", "REJECTED", "REVOKED"];
const TONE: Record<HostStatus, StatusTone> = {
  PENDING: "warning",
  APPROVED: "positive",
  REJECTED: "negative",
  REVOKED: "negative",
};
const ALL = "all";

/** Which decisions to offer; manar-api's state table (docs/hosts.md) stays the authority. */
export function offeredDecisions(host: Host): HostDecision[] {
  const out: HostDecision[] = [];
  const rekey = Boolean(host.pendingKeyFingerprint);
  if (
    host.status === "PENDING" ||
    host.status === "REJECTED" ||
    (rekey && host.status === "APPROVED")
  )
    out.push("approve");
  if (host.status === "PENDING" || (rekey && host.status === "APPROVED")) out.push("reject");
  if (host.status === "PENDING" || host.status === "APPROVED") out.push("revoke");
  return out;
}

const columnHelper = createManarColumnHelper<Host>();

export function HostsTab({ canWrite }: { canWrite: boolean }) {
  const t = useTranslations("hosts");
  const tCommon = useTranslations("common.actions");
  const format = useFormatter();
  const [status, setStatus] = useState("");
  const [group, setGroup] = useState("");
  const [deciding, setDeciding] = useState<{ host: Host; decision: HostDecision } | null>(null);

  const groups = useHostGroups();
  const query = useHostsList({ status: status as HostStatus | "", hostGroupId: group });
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const groupName = (id: string) => groups.data?.find((g) => g.id === id)?.name ?? id;

  const columns: ManarColumnDef<Host, unknown>[] = [
    columnHelper.display({
      id: "host",
      header: t("hosts.columns.host"),
      cell: ({ row }) => {
        const h = row.original;
        return (
          <div className="flex flex-col gap-1">
            <span className="font-medium text-foreground">{h.hostname}</span>
            <span className="text-xs text-muted-foreground">
              {h.os} · {h.machineId}
            </span>
            {h.pendingKeyFingerprint && (
              <div className="flex flex-col gap-0.5 text-xs">
                <StatusBadge tone="warning" className="self-start">
                  <WarningIcon aria-hidden />
                  {t("hosts.rekey.badge")}
                </StatusBadge>
                <span className="font-mono" dir="ltr" title={h.keyFingerprint}>
                  {t("hosts.rekey.old")}: {shortFingerprint(h.keyFingerprint)}
                </span>
                <span className="font-mono" dir="ltr" title={h.pendingKeyFingerprint}>
                  {t("hosts.rekey.new")}: {shortFingerprint(h.pendingKeyFingerprint)}
                </span>
                {h.pendingHostGroupId && h.pendingHostGroupId !== h.hostGroupId && (
                  <span className="text-muted-foreground">{t("hosts.rekey.otherGroup")}</span>
                )}
              </div>
            )}
          </div>
        );
      },
    }) as ManarColumnDef<Host, unknown>,
    columnHelper.display({
      id: "group",
      header: t("hosts.columns.group"),
      cell: ({ row }) => groupName(row.original.hostGroupId),
    }) as ManarColumnDef<Host, unknown>,
    columnHelper.display({
      id: "status",
      header: t("hosts.columns.status"),
      cell: ({ row }) => (
        <StatusBadge tone={TONE[row.original.status]}>
          {t(`status.${row.original.status}`)}
        </StatusBadge>
      ),
    }) as ManarColumnDef<Host, unknown>,
    columnHelper.display({
      id: "keyType",
      header: t("hosts.columns.keyType"),
      cell: ({ row }) =>
        row.original.keyType === "SOFTWARE" ? (
          <StatusBadge tone="warning">
            <span title={t("hosts.softwareKeyHint")}>{t("hosts.softwareKey")}</span>
          </StatusBadge>
        ) : (
          <span className="text-xs">{t("hosts.tpmKey")}</span>
        ),
    }) as ManarColumnDef<Host, unknown>,
    columnHelper.display({
      id: "lastSeen",
      header: t("hosts.columns.lastSeen"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {row.original.lastSeenAt
            ? format.dateTime(new Date(row.original.lastSeenAt), {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : t("hosts.never")}
        </span>
      ),
    }) as ManarColumnDef<Host, unknown>,
    ...(canWrite
      ? [
          columnHelper.display({
            id: "actions",
            header: t("hosts.columns.actions"),
            cell: ({ row }) => {
              const h = row.original;
              const rekey = Boolean(h.pendingKeyFingerprint);
              return (
                <div className="flex flex-wrap gap-1">
                  {offeredDecisions(h).map((decision) => (
                    <Button
                      key={decision}
                      size="xs"
                      variant={decision === "revoke" ? "destructive" : "outline"}
                      onClick={() => setDeciding({ host: h, decision })}
                    >
                      {t(
                        `hosts.actions.${rekey && decision !== "revoke" ? `${decision}Rekey` : decision}`,
                      )}
                    </Button>
                  ))}
                </div>
              );
            },
          }) as ManarColumnDef<Host, unknown>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <OptionSelect
          className="w-44"
          ariaLabel={t("filters.status")}
          value={status || ALL}
          onChange={(v) => setStatus(v === ALL ? "" : v)}
          options={[
            { value: ALL, label: t("filters.allStatuses") },
            ...STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })),
          ]}
        />
        <OptionSelect
          className="w-52"
          ariaLabel={t("filters.group")}
          value={group || ALL}
          onChange={(v) => setGroup(v === ALL ? "" : v)}
          options={[
            { value: ALL, label: t("filters.allGroups") },
            ...(groups.data ?? []).map((g) => ({ value: g.id, label: g.name })),
          ]}
        />
      </div>
      <p className="text-xs text-muted-foreground">{t("selfReported")}</p>
      <QueryBlock
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        refetch={() => query.refetch()}
      >
        {items.length === 0 ? (
          <EmptyState icon={DesktopTowerIcon} description={t("hosts.empty")} />
        ) : (
          <>
            <DataTable columns={columns} data={items} emptyMessage={t("hosts.empty")} />
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
      </QueryBlock>
      {deciding && <DecisionDialog {...deciding} onClose={() => setDeciding(null)} />}
    </div>
  );
}

/** The confirm step. Approving a pending rekey sends exactly the host's `pendingKeyFingerprint`. */
export function DecisionDialog({
  host,
  decision,
  onClose,
}: {
  host: Host;
  decision: HostDecision;
  onClose: () => void;
}) {
  const t = useTranslations("hosts");
  const tCommon = useTranslations("common.actions");
  const mutation = useHostDecision();
  const rekey = Boolean(host.pendingKeyFingerprint) && decision !== "revoke";
  const key = `${decision}${rekey ? "Rekey" : ""}`;
  const fingerprint = rekey && decision === "approve" ? host.pendingKeyFingerprint! : undefined;

  function confirm() {
    mutation.mutate(
      { id: host.id, decision, keyFingerprint: fingerprint },
      {
        onSuccess: () => {
          toast.success(t("hosts.confirm.success"));
          onClose();
        },
      },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(`hosts.confirm.${key}Title`, { hostname: host.hostname })}</DialogTitle>
          <DialogDescription>{t(`hosts.confirm.${key}Body`)}</DialogDescription>
        </DialogHeader>
        {rekey && (
          <dl className="flex flex-col gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">{t("hosts.rekey.old")}</dt>
              <dd className="font-mono break-all" dir="ltr">
                {host.keyFingerprint}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("hosts.rekey.new")}</dt>
              <dd className="font-mono break-all" dir="ltr">
                {host.pendingKeyFingerprint}
              </dd>
            </div>
          </dl>
        )}
        {mutation.isError && (
          <p role="alert" className="text-sm text-destructive">
            {apiErrorMessage(mutation.error, t("hosts.confirm.failed"))}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant={decision === "revoke" ? "destructive" : "default"}
            disabled={mutation.isPending}
            onClick={confirm}
          >
            {mutation.isPending ? tCommon("submitting") : tCommon("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
