"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/manar/page-header";
import { ManageRolesDialog } from "@/components/manar/users/manage-roles-dialog";
import {
  DataTable,
  createManarColumnHelper,
  type ManarColumnDef,
} from "@/components/manar/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsersList, type UserSummary } from "@/hooks/use-users";
import { apiErrorMessage } from "@/lib/api/errors";
import { isRoleManager } from "@/lib/roles";

export interface UsersListViewProps {
  /** The signed-in caller's own roles + Keycloak subject, from the
   * session (Phase 11a) — used only for two UX-nicety decisions: whether
   * to render role-management controls at all (mirrors `UsersController`'s
   * `@RequireRole('TENANT_OWNER', 'SECURITY_ADMIN')` on the grant/revoke
   * endpoints), and marking the caller's own row. manar-api enforces the
   * real gate regardless of what this page shows. */
  currentUserRoles: readonly string[];
  currentUserSubject: string;
}

const columnHelper = createManarColumnHelper<UserSummary>();

export function UsersListView({ currentUserRoles, currentUserSubject }: UsersListViewProps) {
  const t = useTranslations("users");
  const tCommon = useTranslations("common.actions");

  const query = useUsersList();
  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const canManageRoles = isRoleManager(currentUserRoles);

  const columns: ManarColumnDef<UserSummary, unknown>[] = [
    columnHelper.accessor("displayName", {
      header: t("columns.user"),
      cell: (info) => {
        const user = info.row.original;
        const isSelf = user.keycloakSubject === currentUserSubject;
        return (
          <div className="flex flex-col">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              {user.displayName || user.email}
              {isSelf && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {t("you")}
                </Badge>
              )}
            </span>
            {user.displayName && (
              <span className="text-xs text-muted-foreground">{user.email}</span>
            )}
          </div>
        );
      },
    }) as ManarColumnDef<UserSummary, unknown>,
    columnHelper.display({
      id: "roles",
      header: t("columns.roles"),
      cell: (info) => {
        const user = info.row.original;
        return (
          <div className="flex flex-wrap gap-1">
            {user.roles.length === 0 ? (
              <span className="text-xs text-muted-foreground">{t("noRoles")}</span>
            ) : (
              user.roles.map((binding) => (
                <Badge key={binding.role} variant="outline" className="text-[10px]">
                  {binding.role}
                </Badge>
              ))
            )}
          </div>
        );
      },
    }) as ManarColumnDef<UserSummary, unknown>,
    columnHelper.accessor("lastSeenAt", {
      header: t("columns.lastSeen"),
      cell: (info) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {new Date(info.getValue()).toLocaleString()}
        </span>
      ),
    }) as ManarColumnDef<UserSummary, unknown>,
    ...(canManageRoles
      ? [
          columnHelper.display({
            id: "actions",
            header: t("columns.actions"),
            cell: (info) => (
              <ManageRolesDialog user={info.row.original} currentUserRoles={currentUserRoles} />
            ),
          }) as ManarColumnDef<UserSummary, unknown>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />

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
      ) : (
        <>
          <DataTable columns={columns} data={items} emptyMessage={t("empty")} />
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
