"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  DataTable,
  createManarColumnHelper,
  type ManarColumnDef,
} from "@/components/manar/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useApprovalRules,
  useHostGroups,
  useSaveApprovalRule,
  type ApprovalRule,
} from "@/hooks/use-hosts";
import { FormDialog, OptionSelect, QueryBlock, parseLines } from "./shared";

const ANY = "any";
const columnHelper = createManarColumnHelper<ApprovalRule>();

export function RulesTab({ canWrite }: { canWrite: boolean }) {
  const t = useTranslations("hosts");
  const tr = useTranslations("hosts.rules");
  const rules = useApprovalRules();
  const groups = useHostGroups();
  const toggle = useSaveApprovalRule();
  const [editing, setEditing] = useState<ApprovalRule | "new" | null>(null);
  const groupName = (id: string | null) =>
    id ? (groups.data?.find((g) => g.id === id)?.name ?? id) : tr("anyGroup");

  const columns: ManarColumnDef<ApprovalRule, unknown>[] = [
    columnHelper.display({
      id: "pattern",
      header: tr("columns.pattern"),
      cell: ({ row }) =>
        row.original.hostnamePattern ? (
          <span className="font-mono text-xs" dir="ltr">
            {row.original.hostnamePattern}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{tr("anyHostname")}</span>
        ),
    }) as ManarColumnDef<ApprovalRule, unknown>,
    columnHelper.display({
      id: "group",
      header: tr("columns.group"),
      cell: ({ row }) => groupName(row.original.hostGroupId),
    }) as ManarColumnDef<ApprovalRule, unknown>,
    columnHelper.display({
      id: "ranges",
      header: tr("columns.ranges"),
      cell: ({ row }) =>
        row.original.cidrs.length ? (
          <span className="font-mono text-xs" dir="ltr">
            {row.original.cidrs.join(", ")}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{tr("anyAddress")}</span>
        ),
    }) as ManarColumnDef<ApprovalRule, unknown>,
    columnHelper.display({
      id: "tpm",
      header: tr("columns.tpm"),
      cell: ({ row }) => (row.original.requireTpm ? tr("requiresTpm") : tr("anyKey")),
    }) as ManarColumnDef<ApprovalRule, unknown>,
    columnHelper.display({
      id: "enabled",
      header: tr("columns.enabled"),
      cell: ({ row }) => (
        <Switch
          size="sm"
          checked={row.original.enabled}
          disabled={!canWrite || toggle.isPending}
          aria-label={tr("toggle", { pattern: row.original.hostnamePattern ?? tr("anyHostname") })}
          onCheckedChange={(enabled) => toggle.mutate({ id: row.original.id, body: { enabled } })}
        />
      ),
    }) as ManarColumnDef<ApprovalRule, unknown>,
    ...(canWrite
      ? [
          columnHelper.display({
            id: "actions",
            header: tr("columns.actions"),
            cell: ({ row }) => (
              <Button size="xs" variant="outline" onClick={() => setEditing(row.original)}>
                {tr("edit")}
              </Button>
            ),
          }) as ManarColumnDef<ApprovalRule, unknown>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{tr("description")}</p>
      <p className="text-xs text-muted-foreground">{t("selfReported")}</p>
      {canWrite && (
        <Button size="sm" className="self-start" onClick={() => setEditing("new")}>
          {tr("create")}
        </Button>
      )}
      {toggle.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t("loadError")}
        </p>
      )}
      <QueryBlock
        isPending={rules.isPending}
        isError={rules.isError}
        error={rules.error}
        refetch={() => rules.refetch()}
      >
        <DataTable columns={columns} data={rules.data ?? []} emptyMessage={tr("empty")} />
      </QueryBlock>
      {editing && (
        <RuleDialog
          rule={editing === "new" ? null : editing}
          groups={groups.data ?? []}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function RuleDialog({
  rule,
  groups,
  onClose,
}: {
  rule: ApprovalRule | null;
  groups: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const t = useTranslations("hosts.rules.form");
  const save = useSaveApprovalRule();
  const [pattern, setPattern] = useState(rule?.hostnamePattern ?? "");
  const [group, setGroup] = useState(rule?.hostGroupId ?? ANY);
  const [ranges, setRanges] = useState((rule?.cidrs ?? []).join("\n"));
  const [requireTpm, setRequireTpm] = useState(rule?.requireTpm ?? false);
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const tAny = useTranslations("hosts.rules");
  return (
    <FormDialog
      title={t("title")}
      submitLabel={t("submit")}
      pending={save.isPending}
      error={save.error}
      onClose={onClose}
      onSubmit={() =>
        save.mutate(
          {
            id: rule?.id,
            body: {
              hostnamePattern: pattern.trim() || null,
              // The group is fixed once a rule exists (the API's update omits it).
              ...(rule ? {} : { hostGroupId: group === ANY ? null : group }),
              cidrs: parseLines(ranges),
              requireTpm,
              enabled,
            },
          },
          { onSuccess: onClose },
        )
      }
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rule-pattern">{t("pattern")}</Label>
        <Input
          id="rule-pattern"
          dir="ltr"
          maxLength={255}
          pattern="[A-Za-z0-9.*?_\-]*"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
        />
        <span className="text-xs text-muted-foreground">{t("patternHint")}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("group")}</Label>
        {rule ? (
          <span className="text-sm">
            {rule.hostGroupId
              ? (groups.find((g) => g.id === rule.hostGroupId)?.name ?? rule.hostGroupId)
              : tAny("anyGroup")}
          </span>
        ) : (
          <OptionSelect
            ariaLabel={t("group")}
            value={group}
            onChange={setGroup}
            options={[
              { value: ANY, label: tAny("anyGroup") },
              ...groups.map((g) => ({ value: g.id, label: g.name })),
            ]}
          />
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rule-ranges">{t("ranges")}</Label>
        <Textarea
          id="rule-ranges"
          dir="ltr"
          value={ranges}
          onChange={(e) => setRanges(e.target.value)}
        />
        <span className="text-xs text-muted-foreground">{t("rangesHint")}</span>
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="rule-tpm">{t("requireTpm")}</Label>
        <Switch id="rule-tpm" checked={requireTpm} onCheckedChange={setRequireTpm} />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="rule-enabled">{t("enabled")}</Label>
        <Switch id="rule-enabled" checked={enabled} onCheckedChange={setEnabled} />
      </div>
    </FormDialog>
  );
}
