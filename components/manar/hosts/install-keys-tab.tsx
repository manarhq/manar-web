"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { KeyIcon } from "@phosphor-icons/react/ssr";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateInstallKey,
  useHostGroups,
  useInstallKeys,
  useRevokeInstallKey,
  type InstallKey,
} from "@/hooks/use-hosts";
import { apiErrorMessage } from "@/lib/api/errors";
import { FormDialog, OptionSelect, QueryBlock, parseLines } from "./shared";

type State = "active" | "revoked" | "expired";
const TONE: Record<State, StatusTone> = {
  active: "positive",
  revoked: "negative",
  expired: "neutral",
};
const stateOf = (k: InstallKey): State =>
  k.revokedAt
    ? "revoked"
    : k.expiresAt && new Date(k.expiresAt) < new Date()
      ? "expired"
      : "active";

const columnHelper = createManarColumnHelper<InstallKey>();

export function InstallKeysTab({ canWrite }: { canWrite: boolean }) {
  const t = useTranslations("hosts.installKeys");
  const format = useFormatter();
  const keys = useInstallKeys();
  const groups = useHostGroups();
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<InstallKey | null>(null);
  const groupName = (id: string) => groups.data?.find((g) => g.id === id)?.name ?? id;

  const columns: ManarColumnDef<InstallKey, unknown>[] = [
    columnHelper.accessor("label", { header: t("columns.label") }) as ManarColumnDef<
      InstallKey,
      unknown
    >,
    columnHelper.display({
      id: "group",
      header: t("columns.group"),
      cell: ({ row }) => groupName(row.original.hostGroupId),
    }) as ManarColumnDef<InstallKey, unknown>,
    columnHelper.display({
      id: "uses",
      header: t("columns.uses"),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.uses} / {row.original.maxUses ?? t("unlimited")}
        </span>
      ),
    }) as ManarColumnDef<InstallKey, unknown>,
    columnHelper.display({
      id: "ranges",
      header: t("columns.ranges"),
      cell: ({ row }) =>
        row.original.allowedCidrs.length === 0 ? (
          <span className="text-xs text-muted-foreground">{t("anyAddress")}</span>
        ) : (
          <span className="font-mono text-xs" dir="ltr">
            {row.original.allowedCidrs.join(", ")}
          </span>
        ),
    }) as ManarColumnDef<InstallKey, unknown>,
    columnHelper.display({
      id: "expires",
      header: t("columns.expires"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {row.original.expiresAt
            ? format.dateTime(new Date(row.original.expiresAt), {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : t("noExpiry")}
        </span>
      ),
    }) as ManarColumnDef<InstallKey, unknown>,
    columnHelper.display({
      id: "status",
      header: t("columns.status"),
      cell: ({ row }) => {
        const s = stateOf(row.original);
        return <StatusBadge tone={TONE[s]}>{t(`state.${s}`)}</StatusBadge>;
      },
    }) as ManarColumnDef<InstallKey, unknown>,
    ...(canWrite
      ? [
          columnHelper.display({
            id: "actions",
            header: t("columns.actions"),
            cell: ({ row }) =>
              stateOf(row.original) === "active" ? (
                <Button size="xs" variant="destructive" onClick={() => setRevoking(row.original)}>
                  {t("revoke")}
                </Button>
              ) : null,
          }) as ManarColumnDef<InstallKey, unknown>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-3">
      {canWrite && (
        <Button size="sm" className="self-start" onClick={() => setCreating(true)}>
          {t("create")}
        </Button>
      )}
      <QueryBlock
        isPending={keys.isPending}
        isError={keys.isError}
        error={keys.error}
        refetch={() => keys.refetch()}
      >
        {(keys.data ?? []).length === 0 ? (
          <EmptyState icon={KeyIcon} description={t("empty")} />
        ) : (
          <DataTable columns={columns} data={keys.data ?? []} emptyMessage={t("empty")} />
        )}
      </QueryBlock>
      {creating && <CreateKeyDialog onClose={() => setCreating(false)} />}
      {revoking && <RevokeKeyDialog installKey={revoking} onClose={() => setRevoking(null)} />}
    </div>
  );
}

function RevokeKeyDialog({ installKey, onClose }: { installKey: InstallKey; onClose: () => void }) {
  const t = useTranslations("hosts.installKeys");
  const tCommon = useTranslations("common.actions");
  const revoke = useRevokeInstallKey();
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("revokeTitle", { label: installKey.label })}</DialogTitle>
          <DialogDescription>{t("revokeBody")}</DialogDescription>
        </DialogHeader>
        {revoke.isError && (
          <p role="alert" className="text-sm text-destructive">
            {apiErrorMessage(revoke.error)}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={revoke.isPending}
            onClick={() => revoke.mutate(installKey.id, { onSuccess: onClose })}
          >
            {t("revoke")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Create form, then the show-once panel. The raw key is read from the mutation result only while
 * this dialog is open; closing resets the mutation, and the hook sets `gcTime: 0`.
 */
function CreateKeyDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations("hosts.installKeys");
  const tCommon = useTranslations("common.actions");
  const groups = useHostGroups();
  const create = useCreateInstallKey();
  const [groupId, setGroupId] = useState("");
  const [label, setLabel] = useState("");
  const [ranges, setRanges] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expires, setExpires] = useState("");
  const [copied, setCopied] = useState(false);

  function close() {
    create.reset();
    onClose();
  }

  const raw = create.data?.installKey;
  if (raw) {
    return (
      <Dialog open onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("shown.title")}</DialogTitle>
            <DialogDescription role="alert">{t("shown.warning")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("shown.keyLabel")}</span>
            <code
              data-testid="install-key-value"
              dir="ltr"
              className="rounded-md border border-border bg-subtle p-2 font-mono text-xs break-all select-all"
            >
              {raw}
            </code>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(raw);
                  setCopied(true);
                  toast.success(tCommon("copied"));
                } catch {
                  // Clipboard blocked: the key stays selectable above.
                }
              }}
            >
              {copied ? tCommon("copied") : tCommon("copy")}
            </Button>
            <Button onClick={close}>{t("shown.done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <FormDialog
      title={t("form.title")}
      description={t("form.description")}
      submitLabel={t("form.submit")}
      pending={create.isPending}
      error={create.error}
      onClose={close}
      onSubmit={() => {
        if (!groupId || !label.trim()) return;
        const cidrs = parseLines(ranges);
        create.mutate({
          hostGroupId: groupId,
          label: label.trim(),
          ...(cidrs.length ? { allowedCidrs: cidrs } : {}),
          ...(maxUses ? { maxUses: Number(maxUses) } : {}),
          ...(expires ? { expiresAt: new Date(expires).toISOString() } : {}),
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label>{t("form.group")}</Label>
        <OptionSelect
          ariaLabel={t("form.group")}
          placeholder={t("form.groupPlaceholder")}
          value={groupId}
          onChange={setGroupId}
          options={(groups.data ?? []).map((g) => ({ value: g.id, label: g.name }))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ik-label">{t("form.label")}</Label>
        <Input
          id="ik-label"
          required
          maxLength={200}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ik-ranges">{t("form.ranges")}</Label>
        <Textarea
          id="ik-ranges"
          dir="ltr"
          value={ranges}
          onChange={(e) => setRanges(e.target.value)}
        />
        <span className="text-xs text-muted-foreground">{t("form.rangesHint")}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ik-max">{t("form.maxUses")}</Label>
          <Input
            id="ik-max"
            type="number"
            min={1}
            max={1000000}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ik-exp">{t("form.expires")}</Label>
          <Input
            id="ik-exp"
            type="datetime-local"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
          />
        </div>
      </div>
    </FormDialog>
  );
}
