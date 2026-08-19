"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useRef } from "react";
import { Moon, Sun, LogOut, Globe, Menu } from "lucide-react";

import { usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useUiStore } from "@/lib/stores/ui-store";
import { Breadcrumbs } from "@/components/manar/breadcrumbs";
import { CommandPalette } from "@/components/manar/command-palette";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface TopbarProps {
  tenantSlug: string;
  displayName?: string;
  email?: string;
}

function initialsFor(displayName: string | undefined, email: string | undefined): string {
  const source = displayName ?? email ?? "?";
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Tenant/user context display + theme + language controls (Section 60).
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
export function Topbar({ tenantSlug, displayName, email }: TopbarProps) {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const logoutFormRef = useRef<HTMLFormElement>(null);
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
          <Menu className="size-4" />
        </Button>
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="hidden shrink-0 truncate text-muted-foreground sm:inline">
            {t("tenantLabel")} <span className="text-foreground">{tenantSlug}</span>
          </span>
          <span className="truncate text-foreground sm:hidden">{tenantSlug}</span>
          <Breadcrumbs />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <CommandPalette />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" aria-label={t("language.label")} />}
          >
            <Globe className="size-4" />
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

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("theme.toggle")}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="sm" className="gap-2 ps-1.5" />}
          >
            <Avatar className="size-5">
              <AvatarFallback className="text-2xs">
                {initialsFor(displayName, email)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-32 truncate text-xs md:inline">
              {displayName ?? email}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              {t("userMenu.signedInAs")} {email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => logoutFormRef.current?.requestSubmit()}
            >
              <LogOut className="size-4" />
              {t("userMenu.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Kept outside the menu markup: a DropdownMenuItem isn't a valid
         * place to nest a <form>, so the item above just triggers this
         * real, plain HTML form submit instead. */}
        <form ref={logoutFormRef} method="POST" action="/api/auth/logout" className="hidden">
          <input type="hidden" name="locale" value={locale} />
        </form>
      </div>
    </header>
  );
}
