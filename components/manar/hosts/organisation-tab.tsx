"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import {
  DataTable,
  createManarColumnHelper,
  type ManarColumnDef,
} from "@/components/manar/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useHostGroups,
  useOrgUnits,
  useSaveHostGroup,
  useSaveOrgUnit,
  type HostGroup,
  type OrgUnit,
} from "@/hooks/use-hosts";
import { FormDialog, OptionSelect, QueryBlock } from "./shared";

const NONE = "none";

/** Depth-first order with depth; an orphan or a cycle member is shown at the top level. */
export function orgUnitTree(units: OrgUnit[]): Array<OrgUnit & { depth: number }> {
  const ids = new Set(units.map((u) => u.id));
  const kids = new Map<string | null, OrgUnit[]>();
  for (const u of units) {
    const parent = u.parentId && ids.has(u.parentId) ? u.parentId : null;
    kids.set(parent, [...(kids.get(parent) ?? []), u]);
  }
  const out: Array<OrgUnit & { depth: number }> = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number) => {
    for (const u of kids.get(parent) ?? []) {
      if (seen.has(u.id)) continue;
      seen.add(u.id);
      out.push({ ...u, depth });
      walk(u.id, depth + 1);
    }
  };
  walk(null, 0);
  for (const u of units) if (!seen.has(u.id)) out.push({ ...u, depth: 0 });
  return out;
}

const groupCols = createManarColumnHelper<HostGroup>();
const unitCols = createManarColumnHelper<OrgUnit & { depth: number }>();

export function OrganisationTab({ canWrite }: { canWrite: boolean }) {
  const t = useTranslations("hosts.organisation");
  const groups = useHostGroups();
  const units = useOrgUnits();
  const [group, setGroup] = useState<HostGroup | "new" | null>(null);
  const [unit, setUnit] = useState<OrgUnit | "new" | null>(null);
  const tree = useMemo(() => orgUnitTree(units.data ?? []), [units.data]);
  const unitName = (id: string | null) => units.data?.find((u) => u.id === id)?.name ?? t("none");

  const groupColumns: ManarColumnDef<HostGroup, unknown>[] = [
    groupCols.accessor("name", { header: t("columns.name") }) as ManarColumnDef<HostGroup, unknown>,
    groupCols.display({
      id: "orgUnit",
      header: t("columns.orgUnit"),
      cell: ({ row }) => unitName(row.original.orgUnitId),
    }) as ManarColumnDef<HostGroup, unknown>,
    ...(canWrite
      ? [
          groupCols.display({
            id: "actions",
            header: t("columns.actions"),
            cell: ({ row }) => (
              <Button size="xs" variant="outline" onClick={() => setGroup(row.original)}>
                {t("edit")}
              </Button>
            ),
          }) as ManarColumnDef<HostGroup, unknown>,
        ]
      : []),
  ];
  const unitColumns: ManarColumnDef<OrgUnit & { depth: number }, unknown>[] = [
    unitCols.display({
      id: "name",
      header: t("columns.name"),
      cell: ({ row }) => (
        <span
          className="flex items-center gap-1.5"
          style={{ paddingInlineStart: `${row.original.depth * 1.25}rem` }}
        >
          {row.original.name}
          {row.original.source !== "MANUAL" && (
            <Badge variant="outline" className="text-2xs" title={t("synced")}>
              {row.original.source}
            </Badge>
          )}
        </span>
      ),
    }) as ManarColumnDef<OrgUnit & { depth: number }, unknown>,
    ...(canWrite
      ? [
          unitCols.display({
            id: "actions",
            header: t("columns.actions"),
            cell: ({ row }) => (
              <Button size="xs" variant="outline" onClick={() => setUnit(row.original)}>
                {t("edit")}
              </Button>
            ),
          }) as ManarColumnDef<OrgUnit & { depth: number }, unknown>,
        ]
      : []),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-3" aria-labelledby="hosts-groups">
        <div className="flex items-center justify-between">
          <h2 id="hosts-groups" className="text-sm font-semibold">
            {t("groups")}
          </h2>
          {canWrite && (
            <Button size="xs" onClick={() => setGroup("new")}>
              {t("createGroup")}
            </Button>
          )}
        </div>
        <QueryBlock
          isPending={groups.isPending}
          isError={groups.isError}
          error={groups.error}
          refetch={() => groups.refetch()}
        >
          <DataTable columns={groupColumns} data={groups.data ?? []} emptyMessage={t("noGroups")} />
        </QueryBlock>
      </section>
      <section className="flex flex-col gap-3" aria-labelledby="hosts-units">
        <div className="flex items-center justify-between">
          <h2 id="hosts-units" className="text-sm font-semibold">
            {t("orgUnits")}
          </h2>
          {canWrite && (
            <Button size="xs" onClick={() => setUnit("new")}>
              {t("createOrgUnit")}
            </Button>
          )}
        </div>
        <QueryBlock
          isPending={units.isPending}
          isError={units.isError}
          error={units.error}
          refetch={() => units.refetch()}
        >
          <DataTable columns={unitColumns} data={tree} emptyMessage={t("noOrgUnits")} />
        </QueryBlock>
      </section>
      {group && (
        <GroupDialog
          group={group === "new" ? null : group}
          units={units.data ?? []}
          onClose={() => setGroup(null)}
        />
      )}
      {unit && (
        <OrgUnitDialog
          unit={unit === "new" ? null : unit}
          units={units.data ?? []}
          onClose={() => setUnit(null)}
        />
      )}
    </div>
  );
}

function GroupDialog({
  group,
  units,
  onClose,
}: {
  group: HostGroup | null;
  units: OrgUnit[];
  onClose: () => void;
}) {
  const t = useTranslations("hosts.organisation");
  const save = useSaveHostGroup();
  const [name, setName] = useState(group?.name ?? "");
  const [orgUnit, setOrgUnit] = useState(group?.orgUnitId ?? NONE);
  return (
    <FormDialog
      title={t("groupTitle")}
      submitLabel={t("save")}
      pending={save.isPending}
      error={save.error}
      onClose={onClose}
      onSubmit={() =>
        save.mutate(
          {
            id: group?.id,
            body: { name: name.trim(), orgUnitId: orgUnit === NONE ? null : orgUnit },
          },
          { onSuccess: onClose },
        )
      }
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hg-name">{t("name")}</Label>
        <Input
          id="hg-name"
          required
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("orgUnit")}</Label>
        <OptionSelect
          ariaLabel={t("orgUnit")}
          value={orgUnit}
          onChange={setOrgUnit}
          options={[
            { value: NONE, label: t("none") },
            ...units.map((u) => ({ value: u.id, label: u.name })),
          ]}
        />
      </div>
    </FormDialog>
  );
}

/** A move under the unit's own subtree comes back as an API 400, shown inline; the dialog stays open. */
function OrgUnitDialog({
  unit,
  units,
  onClose,
}: {
  unit: OrgUnit | null;
  units: OrgUnit[];
  onClose: () => void;
}) {
  const t = useTranslations("hosts.organisation");
  const save = useSaveOrgUnit();
  const [name, setName] = useState(unit?.name ?? "");
  const [parent, setParent] = useState(unit?.parentId ?? NONE);
  return (
    <FormDialog
      title={t("orgUnitTitle")}
      submitLabel={t("save")}
      pending={save.isPending}
      error={save.error}
      onClose={onClose}
      onSubmit={() =>
        save.mutate(
          { id: unit?.id, body: { name: name.trim(), parentId: parent === NONE ? null : parent } },
          { onSuccess: onClose },
        )
      }
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ou-name">{t("name")}</Label>
        <Input
          id="ou-name"
          required
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("parent")}</Label>
        <OptionSelect
          ariaLabel={t("parent")}
          value={parent}
          onChange={setParent}
          options={[
            { value: NONE, label: t("topLevel") },
            ...units.filter((u) => u.id !== unit?.id).map((u) => ({ value: u.id, label: u.name })),
          ]}
        />
      </div>
    </FormDialog>
  );
}
