"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/ssr";
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
  useHostChanges,
  useRestoreChange,
  type HostChange,
  type RestoreStatus,
} from "@/hooks/use-host-changes";
import { useHostsList } from "@/hooks/use-hosts";
import { apiErrorMessage } from "@/lib/api/errors";
import { OptionSelect, QueryBlock } from "./shared";

const TONE: Record<RestoreStatus, StatusTone> = {
  NONE: "neutral",
  REQUESTED: "warning",
  RESTORED: "positive",
  FAILED: "negative",
};

const columnHelper = createManarColumnHelper<HostChange>();

/** Changes per device, with a restore the device carries out. */
export function ChangesTab({ canWrite }: { canWrite: boolean }) {
  const t = useTranslations("hosts.changes");
  const tCommon = useTranslations("common.actions");
  const format = useFormatter();
  const hosts = useHostsList({ status: "APPROVED" });
  const devices = useMemo(() => hosts.data?.pages.flatMap((p) => p.items) ?? [], [hosts.data]);
  const [picked, setPicked] = useState("");
  const hostId = picked || devices[0]?.id || "";
  const host = devices.find((d) => d.id === hostId);
  const query = useHostChanges(hostId);
  const restore = useRestoreChange(hostId);
  const [asking, setAsking] = useState<HostChange | null>(null);

  const columns: ManarColumnDef<HostChange, unknown>[] = [
    columnHelper.display({
      id: "file",
      header: t("columns.file"),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs break-all" dir="ltr">
            {row.original.path}
          </span>
          <span className="text-xs text-muted-foreground">
            {t(row.original.existed ? "kind.changed" : "kind.created")}
          </span>
        </div>
      ),
    }) as ManarColumnDef<HostChange, unknown>,
    columnHelper.display({
      id: "tool",
      header: t("columns.tool"),
      cell: ({ row }) => <span className="text-xs">{row.original.tool}</span>,
    }) as ManarColumnDef<HostChange, unknown>,
    columnHelper.display({
      id: "when",
      header: t("columns.when"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {format.dateTime(new Date(row.original.takenAt), {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
      ),
    }) as ManarColumnDef<HostChange, unknown>,
    columnHelper.display({
      id: "state",
      header: t("columns.state"),
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <StatusBadge tone={TONE[row.original.restoreStatus]} className="self-start">
            {t(`state.${row.original.restoreStatus}`)}
          </StatusBadge>
          {row.original.restoreStatus === "FAILED" && row.original.restoreError && (
            <span className="text-xs text-muted-foreground">{row.original.restoreError}</span>
          )}
        </div>
      ),
    }) as ManarColumnDef<HostChange, unknown>,
    ...(canWrite
      ? [
          columnHelper.display({
            id: "actions",
            header: t("columns.actions"),
            cell: ({ row }) => (
              <Button
                size="xs"
                variant="outline"
                disabled={row.original.restoreStatus === "REQUESTED"}
                onClick={() => setAsking(row.original)}
              >
                {t("restore")}
              </Button>
            ),
          }) as ManarColumnDef<HostChange, unknown>,
        ]
      : []),
  ];

  function confirm() {
    if (!asking) return;
    restore.mutate(asking.id, {
      onSuccess: () => {
        toast.success(t("confirm.success"));
        setAsking(null);
      },
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{t("description")}</p>
      {devices.length === 0 && !hosts.isPending ? (
        <EmptyState icon={ClockCounterClockwiseIcon} description={t("noDevices")} />
      ) : (
        <>
          <OptionSelect
            className="w-64"
            ariaLabel={t("device")}
            placeholder={t("devicePlaceholder")}
            value={hostId}
            onChange={setPicked}
            options={devices.map((d) => ({ value: d.id, label: d.hostname }))}
          />
          {host?.os.toLowerCase().includes("windows") && (
            <p className="text-xs text-muted-foreground">{t("windowsNote")}</p>
          )}
          <QueryBlock
            isPending={hosts.isPending || (Boolean(hostId) && query.isPending)}
            isError={query.isError}
            error={query.error}
            refetch={() => query.refetch()}
          >
            {(query.data ?? []).length === 0 ? (
              <EmptyState icon={ClockCounterClockwiseIcon} description={t("empty")} />
            ) : (
              <DataTable columns={columns} data={query.data ?? []} emptyMessage={t("empty")} />
            )}
          </QueryBlock>
        </>
      )}
      {asking && (
        <Dialog open onOpenChange={(open) => !open && setAsking(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("confirm.title")}</DialogTitle>
              <DialogDescription>
                {t(asking.existed ? "confirm.bodyChanged" : "confirm.bodyCreated", {
                  path: asking.path,
                })}
              </DialogDescription>
            </DialogHeader>
            {restore.isError && (
              <p role="alert" className="text-sm text-destructive">
                {apiErrorMessage(restore.error, t("confirm.failed"))}
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAsking(null)}>
                {tCommon("cancel")}
              </Button>
              <Button disabled={restore.isPending} onClick={confirm}>
                {restore.isPending ? tCommon("submitting") : tCommon("confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
