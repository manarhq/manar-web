"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { MonitorIcon, MoonIcon, SunIcon } from "@phosphor-icons/react/ssr";

import { useHasMounted } from "@/hooks/use-has-mounted";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEMES = ["system", "light", "dark"] as const;
type ThemeChoice = (typeof THEMES)[number];

const ICONS: Record<ThemeChoice, typeof MonitorIcon> = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
};

/**
 * Theme control: System / Light / Dark, in that order because "system" is
 * the default the console now starts from — `app/providers.tsx` runs
 * next-themes with `enableSystem` and `defaultTheme="system"`, so an
 * operator who has never touched this menu gets whatever their OS says,
 * and picking Light or Dark here pins it (next-themes writes the choice
 * to its tenant-scoped `storageKey`, and the pre-paint script in
 * components/manar/preferences/preferences-script.tsx replays it on the
 * next load before anything is painted).
 *
 * This replaces the old two-state icon button, which could only ever
 * express "dark" or "light" and therefore had nowhere to put "I have not
 * chosen; follow the system" — the state the console now boots in.
 *
 * next-themes' `theme` is undefined until its own mount effect has read
 * the resolved value client-side; rendering it straight into the trigger
 * icon or the radio group's `value` is exactly the hydration-mismatch
 * hazard next-themes' docs warn about (and the one this repo has already
 * fixed once). Both are gated on `useHasMounted`, so the server render
 * and the first client pass agree on "system" and the real value swaps in
 * once past hydration.
 */
export function ThemeMenu() {
  const t = useTranslations("common");
  const { theme, setTheme } = useTheme();
  const mounted = useHasMounted();

  const value: ThemeChoice =
    mounted && (THEMES as readonly string[]).includes(theme ?? "")
      ? (theme as ThemeChoice)
      : "system";
  const TriggerIcon = ICONS[value];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={t("theme.toggle")} />}
      >
        <TriggerIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => setTheme(String(next))}>
          {/* Base UI requires Menu.GroupLabel to sit inside its group —
           * a label rendered as a sibling of the radio group throws
           * "MenuGroupContext is missing" at render time. */}
          <DropdownMenuLabel>{t("theme.label")}</DropdownMenuLabel>
          {THEMES.map((choice) => {
            const Icon = ICONS[choice];
            return (
              <DropdownMenuRadioItem key={choice} value={choice} closeOnClick>
                <Icon className="size-4" aria-hidden />
                {t(`theme.${choice}` as "theme.system")}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
