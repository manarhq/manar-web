"use client";

import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { CheckIcon } from "@phosphor-icons/react/ssr";

import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface WorkspaceRow {
  tenantId: string;
  name: string;
  kind: "PERSONAL" | "COMPANY" | "SAMPLE";
  status: string;
  membershipStatus: "ACTIVE" | "PENDING" | "REMOVED";
}

/**
 * Workspace list for the user menu. Only workspaces the user can open now are choosable; a
 * pending company request is shown as such. The choice goes to /api/workspace/switch, which
 * validates it against manar-api before it is stored in the session.
 */
export function WorkspaceSwitcher({ activeWorkspaceId }: { activeWorkspaceId?: string }) {
  const t = useTranslations("workspace");
  const locale = useLocale();
  const { data } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async (): Promise<WorkspaceRow[]> => {
      const response = await fetch("/api/bff/workspaces");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return ((await response.json()) as { items: WorkspaceRow[] }).items;
    },
    staleTime: 30_000,
  });

  // A single workspace needs no switcher.
  if (!data || data.length < 2) return null;

  async function choose(tenantId: string) {
    const response = await fetch("/api/workspace/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });
    if (response.ok) window.location.assign(`/${locale}`);
  }

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
        {t("switcher.label")}
      </DropdownMenuLabel>
      {data.map((w) => {
        const usable = w.membershipStatus === "ACTIVE" && w.status === "ACTIVE";
        const note =
          w.membershipStatus === "PENDING"
            ? t("switcher.pending")
            : !usable
              ? t("switcher.settingUp")
              : null;
        return (
          <DropdownMenuItem
            key={w.tenantId}
            disabled={!usable}
            onClick={() => usable && w.tenantId !== activeWorkspaceId && void choose(w.tenantId)}
          >
            <span className="flex-1 truncate">
              {w.name} <span className="text-xs text-muted-foreground">{t(`kind.${w.kind}`)}</span>
            </span>
            {note && <span className="text-xs text-muted-foreground">{note}</span>}
            {w.tenantId === activeWorkspaceId && <CheckIcon className="size-4" aria-hidden />}
          </DropdownMenuItem>
        );
      })}
      <DropdownMenuSeparator />
    </DropdownMenuGroup>
  );
}
