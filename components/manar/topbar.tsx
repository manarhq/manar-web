"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useRef } from "react";
import { Moon, Sun, LogOut, Globe } from "lucide-react";

import { usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
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
 * A thin, fixed-height bar — this console never scrolls its own chrome. */
export function Topbar({ tenantSlug, displayName, email }: TopbarProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const logoutFormRef = useRef<HTMLFormElement>(null);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="shrink-0 text-muted-foreground">
          {t("tenantLabel")} <span className="text-foreground">{tenantSlug}</span>
        </span>
        <Breadcrumbs />
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
              <AvatarFallback className="text-[10px]">
                {initialsFor(displayName, email)}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-32 truncate text-xs">{displayName ?? email}</span>
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
