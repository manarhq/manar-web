"use client";

import { useLocale, useTranslations } from "next-intl";
import { GlobeIcon, ListIcon } from "@phosphor-icons/react/ssr";

import { usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useUiStore } from "@/lib/stores/ui-store";
import { Breadcrumbs } from "@/components/manar/breadcrumbs";
import { CommandPalette } from "@/components/manar/command-palette";
import { AssistantLauncher } from "@/components/manar/assistant/assistant-launcher";
import { DensityMenu } from "@/components/manar/preferences/density-menu";
import { ThemeMenu } from "@/components/manar/preferences/theme-menu";
import { TutorialHelpMenu } from "@/components/manar/tutorial/help-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserMenu } from "@/components/manar/user-menu";

export interface TopbarProps {
  /** The active workspace's name, from manar-api. */
  workspaceName: string;
  workspaceId?: string;
  displayName?: string;
  email?: string;
}

/** Tenant/user context display + operator preference and language
 * controls (Section 60).
 * A thin, fixed-height bar — this console never scrolls its own chrome.
 *
 * Narrow-width fix (see sidebar.tsx's header comment for the full
 * picture — the two are coupled at <sm width): the hamburger trigger
 * below opens the sidebar's own drawer via the shared `mobileNavOpen` UI
 * store, and everything to the right of it now degrades gracefully
 * instead of overflowing — the tenant label's static word and the
 * command palette's "⌘K" hint disappear first (decorative/redundant once
 * space is tight, the icon and drawer trigger alone stay fully
 * functional), then the signed-in user's name collapses to just the
 * avatar. Verified at 390px with nothing overlapping or clipped — see
 * the task report's screenshot evidence. */
export function Topbar({ workspaceName, workspaceId, displayName, email }: TopbarProps) {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const toggleMobileNav = useUiStore((s) => s.toggleMobileNav);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3 sm:gap-4 sm:px-4">
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 sm:hidden"
          onClick={toggleMobileNav}
          aria-label={tNav("sidebar.openMenu")}
        >
          <ListIcon className="size-4" />
        </Button>
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="hidden shrink-0 truncate text-muted-foreground sm:inline">
            {t("tenantLabel")} <span className="text-foreground">{workspaceName}</span>
          </span>
          <span className="truncate text-foreground sm:hidden">{workspaceName}</span>
          <Breadcrumbs />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <CommandPalette />
        <TutorialHelpMenu />
        <AssistantLauncher scope={`${workspaceId ?? ""}:${email ?? ""}`} />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" aria-label={t("language.label")} />}
          >
            <GlobeIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {routing.locales.map((loc) => (
              <DropdownMenuItem
                key={loc}
                render={
                  <a
                    href={`/${loc}${pathname}`}
                    lang={loc}
                    aria-current={loc === locale ? "true" : undefined}
                  />
                }
              >
                {t(`language.${loc}` as "language.en")}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* The two persisted per-operator preferences. They live here,
         * next to the language switcher, rather than under /settings —
         * /settings is tenant-wide configuration gated to Tenant Owner /
         * Security Admin, and every analyst has to be able to change
         * their own density and theme mid-shift. Both are icon-only at
         * every width: the topbar is the one piece of chrome that must
         * survive 390px, and both carry a real aria-label plus a labelled
         * radio group in the menu itself. */}
        <DensityMenu />
        <ThemeMenu />

        <UserMenu displayName={displayName} email={email} workspaceId={workspaceId} />
      </div>
    </header>
  );
}
