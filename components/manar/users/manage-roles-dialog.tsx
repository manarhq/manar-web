"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserCogIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGrantRole, useRevokeRole, type UserSummary } from "@/hooks/use-users";
import { apiErrorMessage } from "@/lib/api/errors";
import { canGrantRole, ROLES, type RoleName } from "@/lib/roles";

export interface ManageRolesDialogProps {
  user: UserSummary;
  /** The signed-in caller's own current role names, from the session
   * (Phase 11a) — the basis for every "would the backend even allow
   * this?" check this dialog does client-side, purely as a UX nicety.
   * manar-api re-derives and re-enforces the same privilege-escalation
   * guard on every request regardless of what this dialog offers. */
  currentUserRoles: readonly string[];
}

function userDisplayName(user: UserSummary): string {
  return user.displayName || user.email;
}

/**
 * Per-user role grant/revoke UI (Phase 14 design spec, `/users` item 1).
 * Only rendered by `UsersListView` for callers holding `TENANT_OWNER`/
 * `SECURITY_ADMIN` themselves (mirrors `UsersController`'s
 * `@RequireRole` on the grant/revoke endpoints) — every other viewer
 * sees the roster read-only.
 */
export function ManageRolesDialog({ user, currentUserRoles }: ManageRolesDialogProps) {
  const t = useTranslations("users.manageDialog");
  const tCommon = useTranslations("common.actions");
  // See users-list-view.tsx's identical comment: humanizes manar-api's raw
  // SCREAMING_SNAKE_CASE role identifiers via /roles' own labels.
  const tRoles = useTranslations("roles");
  const roleLabels: Record<string, string> = Object.fromEntries(
    ROLES.map((role) => [role, tRoles(`roles.${role}.name`)]),
  );
  const roleLabel = (role: string) => roleLabels[role] ?? role;
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleName | "">("");
  const grantRole = useGrantRole(user.id);
  const revokeRole = useRevokeRole(user.id);

  const heldRoles = new Set(user.roles.map((binding) => binding.role));
  const grantableRoles = ROLES.filter(
    (role) => !heldRoles.has(role) && canGrantRole(currentUserRoles, role),
  );
  const name = userDisplayName(user);

  function handleGrant() {
    if (!selectedRole) return;
    const role = selectedRole;
    grantRole.mutate(role, {
      onSuccess: () => {
        toast.success(t("grantSuccess", { role: roleLabel(role), name }));
        setSelectedRole("");
      },
      onError: (error) => toast.error(apiErrorMessage(error, t("grantError"))),
    });
  }

  function handleRevoke(role: RoleName) {
    revokeRole.mutate(role, {
      onSuccess: () => toast.success(t("revokeSuccess", { role: roleLabel(role), name })),
      onError: (error) => toast.error(apiErrorMessage(error, t("revokeError"))),
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSelectedRole("");
          grantRole.reset();
          revokeRole.reset();
        }
      }}
    >
      <DialogTrigger render={<Button size="xs" variant="outline" />}>
        <UserCogIcon />
        {t("title")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", { name })}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t("currentRolesTitle")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {user.roles.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
              {user.roles.map((binding) => {
                const revocable = canGrantRole(currentUserRoles, binding.role);
                const chip = (
                  <Badge
                    key={binding.role}
                    variant="outline"
                    className="gap-1 py-1"
                    title={binding.role}
                  >
                    <span>{roleLabel(binding.role)}</span>
                    {revocable && (
                      <button
                        type="button"
                        aria-label={t("revoke", { role: roleLabel(binding.role) })}
                        className="rounded-full text-muted-foreground hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                        disabled={revokeRole.isPending}
                        onClick={() => handleRevoke(binding.role as RoleName)}
                      >
                        <XIcon className="size-3" />
                      </button>
                    )}
                  </Badge>
                );
                return revocable ? (
                  chip
                ) : (
                  <Tooltip key={binding.role}>
                    <TooltipTrigger render={<span>{chip}</span>} />
                    <TooltipContent>{t("revokeDisabledHint")}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t("grantTitle")}</span>
            {grantableRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noGrantableRoles")}</p>
            ) : (
              <div className="flex items-center gap-2">
                <Select
                  value={selectedRole || undefined}
                  onValueChange={(value) => setSelectedRole(value as RoleName)}
                >
                  <SelectTrigger className="flex-1" aria-label={t("grantTitle")}>
                    {/* Base UI's SelectValue shows the raw selected value
                     * (a SCREAMING_SNAKE_CASE role id) unless given a
                     * render function — mapped back to its humanized
                     * label here, same as the SelectItem below. */}
                    <SelectValue placeholder={t("grantPlaceholder")}>
                      {(value: string | null) => (value ? roleLabel(value) : null)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {grantableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {roleLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!selectedRole || grantRole.isPending}
                  onClick={handleGrant}
                >
                  {grantRole.isPending ? tCommon("submitting") : t("grantButton")}
                </Button>
              </div>
            )}
          </div>

          {(grantRole.isError || revokeRole.isError) && (
            <p className="text-sm text-destructive">
              {apiErrorMessage(grantRole.error ?? revokeRole.error)}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
