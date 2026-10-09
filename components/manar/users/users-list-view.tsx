"use client";

import { useMemo } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { UsersIcon } from "@phosphor-icons/react/ssr";

import { PageHeader } from "@/components/manar/page-header";
import { EmptyState } from "@/components/manar/empty-state";
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
import { isRoleManager, ROLES } from "@/lib/roles";

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
  // Role names come back as manar-api's raw SCREAMING_SNAKE_CASE identifiers
  // (`lib/roles.ts`'s `RoleName`) — humanized here via /roles' own
  // `roles.<ROLE>.name` labels rather than a second maintained map, same
  // sentence-case treatment design-rework.md asks for everywhere else.
  const tRoles = useTranslations("roles");
  // Every other list page in this app (agents/approvals/audit/tasks/
  // incidents/policies) formats timestamps through next-intl's
  // useFormatter() so they render in the active locale's real date/time
  // conventions (Arabic digits/AM-PM/word order, not just Arabic labels
  // around an English-formatted date). This column was the one holdout
  // still using raw `Date#toLocaleString()`, which always renders in the
  // browser's default locale regardless of the app's own language.
  const format = useFormatter();
  const roleLabels: Record<string, string> = Object.fromEntries(
    ROLES.map((role) => [role, tRoles(`roles.${role}.name`)]),
  );
  const roleLabel = (role: string) => roleLabels[role] ?? role;

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
                <Badge variant="secondary" className="h-4 px-1.5 text-2xs">
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
                <Badge
                  key={binding.role}
                  variant="outline"
                  className="text-2xs"
                  title={binding.role}
                >
                  {roleLabel(binding.role)}
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
          {format.dateTime(new Date(info.getValue()), { dateStyle: "medium", timeStyle: "short" })}
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
      ) : items.length === 0 ? (
        <EmptyState icon={UsersIcon} description={t("empty")} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={items}
            emptyMessage={t("empty")}
            className="max-w-5xl"
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
