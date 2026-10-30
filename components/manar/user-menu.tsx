"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef } from "react";
import { SignOutIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface UserMenuProps {
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

/** The signed-in user's avatar menu (identity and log out), shared by the console top bar and
 * the personal shell's top bar. */
export function UserMenu({ displayName, email }: UserMenuProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const logoutFormRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-2 ps-1.5" />}>
          <Avatar className="size-5">
            <AvatarFallback className="text-2xs">{initialsFor(displayName, email)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-xs md:inline">{displayName ?? email}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Wrapped in a Group deliberately: Base UI's Menu.GroupLabel
           * reads its group context and THROWS ("MenuGroupContext is
           * missing") when rendered as a bare child of the popup — in
           * production as well as development. This menu was that shape
           * until the preference menus next to it hit the same error in
           * a test, so opening the user menu crashed the console. */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              {t("userMenu.signedInAs")} {email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => logoutFormRef.current?.requestSubmit()}
            >
              <SignOutIcon className="size-4 rtl:-scale-x-100" />
              {t("userMenu.logout")}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Kept outside the menu markup: a DropdownMenuItem isn't a valid
       * place to nest a <form>, so the item above just triggers this
       * real, plain HTML form submit instead. */}
      <form ref={logoutFormRef} method="POST" action="/api/auth/logout" className="hidden">
        <input type="hidden" name="locale" value={locale} />
      </form>
    </>
  );
}
