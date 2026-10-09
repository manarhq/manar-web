"use client";

import { useTranslations } from "next-intl";
import { ListDashesIcon, RowsIcon } from "@phosphor-icons/react/ssr";

import { useDensity } from "@/hooks/use-density";
import { DENSITIES, type Density } from "@/components/manar/preferences/preference-storage";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ICONS: Record<Density, typeof RowsIcon> = {
  comfortable: RowsIcon,
  compact: ListDashesIcon,
};

/**
 * Interface-density control: Comfortable (default) / Compact.
 *
 * Lives in the topbar rather than under /settings because density is a
 * per-operator ergonomic choice made mid-shift — the settings pages are
 * tenant-wide configuration, role-gated to Tenant Owner / Security Admin,
 * and an analyst without those roles must still be able to change how
 * dense their own console is.
 *
 * The choice writes to the persisted UI store; everything visual follows
 * from `html[data-density]` and the --density-* tokens in
 * app/globals.css. Nothing here knows what a row height is.
 *
 * The rendered value is gated on `useHasMounted` (inside `useDensity`)
 * for the same reason as the theme menu: the persisted value only exists
 * client-side, so showing it during the first pass would be a hydration
 * mismatch. The *applied* density does not wait for that — the pre-paint
 * script has already set the attribute, so there is no flash, only a
 * radio indicator that settles a frame later.
 */
export function DensityMenu() {
  const t = useTranslations("settings");
  const { density, setDensity } = useDensity();
  const TriggerIcon = ICONS[density];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={t("density.toggle")} />}
      >
        <TriggerIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={density}
          onValueChange={(next) => setDensity(next as Density)}
        >
          {/* Base UI requires Menu.GroupLabel to sit inside its group —
           * a label rendered as a sibling of the radio group throws
           * "MenuGroupContext is missing" at render time. */}
          <DropdownMenuLabel>{t("density.label")}</DropdownMenuLabel>
          {DENSITIES.map((choice) => {
            const Icon = ICONS[choice];
            return (
              <DropdownMenuRadioItem key={choice} value={choice} closeOnClick>
                <Icon className="size-4" aria-hidden />
                {t(`density.${choice}` as "density.comfortable")}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
