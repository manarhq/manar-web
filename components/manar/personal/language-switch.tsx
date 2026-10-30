"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = { en: "EN", ar: "عربي" };
const NAMES: Record<string, string> = { en: "English", ar: "العربية" };

/**
 * The always-visible EN / AR switch. next-intl remembers the choice in its locale cookie when the
 * link is followed, so it persists across visits.
 */
export function LanguageSwitch() {
  const t = useTranslations("personal.topbar");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="inline-flex overflow-hidden rounded-md border border-border text-xs"
    >
      {routing.locales.map((loc) => (
        <Link
          key={loc}
          href={pathname}
          locale={loc}
          lang={loc}
          hrefLang={loc}
          aria-current={loc === locale ? "true" : undefined}
          aria-label={loc === locale ? undefined : t("switchTo", { language: NAMES[loc] })}
          className={cn(
            "tap-target inline-flex items-center px-2.5 transition-colors",
            loc === locale
              ? "bg-card-raised text-foreground"
              : "text-muted-foreground hover:bg-subtle hover:text-foreground",
          )}
        >
          {LABELS[loc] ?? loc.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
