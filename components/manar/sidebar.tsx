"use client";

import { useTranslations } from "next-intl";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import { NAV_GROUPS } from "@/lib/nav-config";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Manar's primary nav: a dense icon+label rail, collapsible to an
 * icon-only strip (Zustand-persisted, Section 57 — pure UI state).
 * Grouped to match the product's real information architecture
 * (monitoring / governance / administration) rather than one flat list.
 * Every link uses i18n/navigation's `Link`, so it stays locale-prefixed
 * and RTL-correct (start/end padding, not left/right) automatically.
 */
export function Sidebar() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-e border-border bg-card transition-[width]",
        collapsed ? "w-14" : "w-56",
      )}
      aria-label={tCommon("appName")}
    >
      <div className="flex h-12 items-center gap-2 border-b border-border px-3">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-xs font-bold text-primary-foreground">
          M
        </div>
        {!collapsed && (
          <span className="truncate text-sm font-semibold tracking-tight text-foreground">
            {tCommon("appName")}{" "}
            <span className="font-normal text-muted-foreground">{tCommon("consoleName")}</span>
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.labelKey} className="mb-3 px-2">
            {!collapsed && (
              <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
                {t(`groups.${group.labelKey}` as "groups.monitoring")}
              </div>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const label = t(`items.${item.labelKey}` as "items.overview");
                const link = (
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                );

                return (
                  <li key={item.href}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger render={link} />
                        <TooltipContent side="right">{label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </Button>
      </div>
    </aside>
  );
}
