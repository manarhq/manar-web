"use client";

import { useTranslations } from "next-intl";
import { ListIcon } from "@phosphor-icons/react/ssr";

import { useUiStore } from "@/lib/stores/ui-store";
import { Button } from "@/components/ui/button";
import { LanguageSwitch } from "@/components/manar/personal/language-switch";
import { ProductName } from "@/components/manar/personal/product-name";
import { ThemeMenu } from "@/components/manar/preferences/theme-menu";
import { UserMenu } from "@/components/manar/user-menu";

export interface PersonalTopbarProps {
  displayName?: string;
  email?: string;
}

/** Top bar of the personal shell: the signed record on the start side; the language switch
 * (always visible), theme toggle (follows the OS until chosen) and account menu on the end. */
export function PersonalTopbar({ displayName, email }: PersonalTopbarProps) {
  const tNav = useTranslations("personal.nav");
  const toggleMobileNav = useUiStore((s) => s.toggleMobileNav);

  return (
    <header className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-background px-4 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 sm:hidden"
          onClick={toggleMobileNav}
          aria-label={tNav("openMenu")}
        >
          <ListIcon className="size-4" />
        </Button>
        <ProductName product="ledger" />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <LanguageSwitch />
        <ThemeMenu />
        <UserMenu displayName={displayName} email={email} />
      </div>
    </header>
  );
}
