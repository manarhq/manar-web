"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import { isRtlLocale } from "@/i18n/routing";
import { NAV_GROUPS } from "@/lib/nav-config";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAttentionCounts, type AttentionCount } from "@/hooks/use-attention-counts";

/** Which nav item's badge each attention count feeds — keyed by href so
 * adding a new counted item later is a one-line addition here, not a
 * new prop threaded through NavItem. */
function attentionCountFor(
  href: string,
  counts: ReturnType<typeof useAttentionCounts>,
): AttentionCount | null {
  if (href === "/approvals") return counts.pendingApprovals;
  if (href === "/incidents") return counts.openIncidents;
  return null;
}

function AttentionBadge({ attention }: { attention: AttentionCount }) {
  if (attention.count === 0) return null;
  return (
    <span className="ms-auto inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 font-mono text-2xs font-semibold text-primary-foreground tabular-nums">
      {attention.hasMore ? `${attention.count}+` : attention.count}
    </span>
  );
}

interface SidebarNavProps {
  collapsed: boolean;
  attentionCounts: ReturnType<typeof useAttentionCounts>;
  pathname: string;
  /** Called after a nav link is activated — closes the mobile drawer.
   * No-op for the persistent rail. */
  onNavigate?: () => void;
}

/** The grouped nav list itself, shared verbatim between the persistent
 * desktop rail and the narrow-viewport drawer (Sheet) below — one source
 * of truth for the Monitoring/Governance/Administration structure and
 * link markup so the two render paths can never drift apart. */
function SidebarNav({ collapsed, attentionCounts, pathname, onNavigate }: SidebarNavProps) {
  const t = useTranslations("nav");

  return (
    <nav className="flex-1 overflow-y-auto py-2">
      {NAV_GROUPS.map((group) => (
        <div key={group.labelKey} className="mb-3 px-2">
          {!collapsed && (
            <div className="text-caps-label px-2 pb-1 text-2xs font-semibold text-muted-foreground/70">
              {t(`groups.${group.labelKey}` as "groups.monitoring")}
            </div>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const label = t(`items.${item.labelKey}` as "items.overview");
              const attention = attentionCountFor(item.href, attentionCounts);
              const link = (
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
                    active
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    collapsed && "justify-center px-0",
                  )}
                >
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  {!collapsed && (
                    <>
                      <span className="truncate">{label}</span>
                      {attention && <AttentionBadge attention={attention} />}
                    </>
                  )}
                </Link>
              );
              const tooltipLabel =
                attention && attention.count > 0
                  ? `${label} (${attention.hasMore ? `${attention.count}+` : attention.count})`
                  : label;

              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger render={link} />
                      <TooltipContent side="right">{tooltipLabel}</TooltipContent>
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
  );
}

function SidebarBrand({ collapsed, extra }: { collapsed: boolean; extra?: ReactNode }) {
  const tCommon = useTranslations("common");
  return (
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
      {extra}
    </div>
  );
}

/**
 * Manar's primary nav: a dense icon+label rail, collapsible to an
 * icon-only strip (Zustand-persisted, Section 57 — pure UI state) on
 * viewports wide enough to host it (>= the `sm` breakpoint, 640px), and a
 * full-width slide-over drawer (Sheet) below that.
 *
 * Narrow-width fix (Task 1's screenshot testing surfaced this at 390px —
 * the persistent rail never collapsed and the topbar's own content
 * overflowed/overlapped it): below `sm` the persistent `<aside>` is not
 * rendered at all (`hidden sm:flex`) rather than merely shrunk, so it
 * never competes with the topbar for the same ~390px of width. In its
 * place, `Topbar` renders a hamburger trigger (see topbar.tsx) that opens
 * this same nav content as an overlay Sheet — see `mobileNavOpen` in
 * lib/stores/ui-store.ts, shared between the two files since they're
 * necessarily coupled at this width. Grouped to match the product's real
 * information architecture (monitoring / governance / administration)
 * rather than one flat list — that grouping is unchanged by this task.
 * Every link uses i18n/navigation's `Link`, so it stays locale-prefixed
 * and RTL-correct (start/end padding, not left/right) automatically.
 */
export function Sidebar() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const attentionCounts = useAttentionCounts();

  return (
    <>
      {/* Persistent rail — sm (640px) and up only. Hidden entirely below
          that rather than shrunk, so it never overlaps the topbar; see
          the drawer below for the narrow-viewport equivalent. */}
      <aside
        className={cn(
          "hidden h-full shrink-0 flex-col border-e border-border bg-card transition-[width] sm:flex",
          collapsed ? "w-14" : "w-56",
        )}
        aria-label={tCommon("appName")}
      >
        <SidebarBrand collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} attentionCounts={attentionCounts} pathname={pathname} />
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={toggleSidebar}
            aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
          >
            {collapsed ? (
              <ChevronsRight className="size-4 rtl:-scale-x-100" />
            ) : (
              <ChevronsLeft className="size-4 rtl:-scale-x-100" />
            )}
          </Button>
        </div>
      </aside>

      {/* Narrow-viewport (<sm) drawer — same nav content, always
          uncollapsed (collapsing to icon-only makes no sense once it's
          already an overlay with the full width available), opened from
          Topbar's hamburger trigger. Side is chosen from the actual
          locale direction rather than the framework default so it slides
          in from the reading-start edge in both LTR and RTL, matching
          where the persistent rail sits at wider widths. */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side={isRtlLocale(locale) ? "right" : "left"}
          className="max-w-[85vw] gap-0 p-0 sm:hidden"
        >
          <SheetTitle className="sr-only">{t("sidebar.title")}</SheetTitle>
          <SidebarBrand collapsed={false} />
          <SidebarNav
            collapsed={false}
            attentionCounts={attentionCounts}
            pathname={pathname}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
