"use client";

import { useLocale, useTranslations } from "next-intl";
import { PlusIcon } from "@phosphor-icons/react/ssr";

import { Link, usePathname } from "@/i18n/navigation";
import { isRtlLocale } from "@/i18n/routing";
import { ADD_DEVICE_HREF, PERSONAL_NAV } from "@/lib/personal/nav";
import { useUiStore } from "@/lib/stores/ui-store";
import { usePendingApprovals } from "@/hooks/use-pending-approvals-count";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

function Brand() {
  const t = useTranslations("common");
  return (
    <div className="flex items-center gap-3 px-2 pb-4 text-base font-semibold text-foreground">
      {/* Placeholder mark from the mockup: blue square with an orange chip. */}
      <span
        aria-hidden
        className="me-2 size-3 rounded-[3px] bg-brand shadow-[14px_0_0_-3px_var(--orange)]"
      />
      {t("appName")}
    </div>
  );
}

function PersonalNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("personal.nav");
  const pathname = usePathname();
  const pending = usePendingApprovals();

  return (
    <nav aria-label={t("label")} className="grid gap-1">
      {PERSONAL_NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const showCount = item.href === "/approvals" && pending.count > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center justify-between rounded-md px-2.5 py-2 text-sm transition-colors",
              active
                ? "bg-brand-soft font-medium text-foreground before:absolute before:inset-y-0 before:start-0 before:w-[3px] before:rounded-sm before:bg-brand"
                : "text-muted-foreground hover:bg-subtle hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2.5">
              <item.icon className="size-5 shrink-0" aria-hidden />
              {t(item.labelKey)}
            </span>
            {showCount && (
              <span
                data-testid="approvals-count"
                className="rounded-full bg-orange px-2 text-xs font-semibold text-brand-text tabular-nums"
              >
                {pending.hasMore ? `${pending.count}+` : pending.count}
              </span>
            )}
          </Link>
        );
      })}
      <Link
        href={ADD_DEVICE_HREF}
        onClick={onNavigate}
        className={cn(buttonVariants({ variant: "primary" }), "mt-3 justify-center gap-1.5")}
      >
        <PlusIcon className="size-4" aria-hidden />
        {t("addDevice")}
      </Link>
    </nav>
  );
}

/** Personal shell navigation: a persistent rail from sm up, the same list in a drawer below. */
export function PersonalSidebar() {
  const t = useTranslations("personal.nav");
  const locale = useLocale();
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);

  return (
    <>
      <aside className="hidden h-full w-56 shrink-0 flex-col overflow-y-auto border-e border-border bg-card px-3.5 py-5 sm:flex">
        <Brand />
        <PersonalNav />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isRtlLocale(locale) ? "right" : "left"}
          className="max-w-[85vw] gap-0 p-4 sm:hidden"
          closeLabel={t("openMenu")}
        >
          <SheetTitle className="sr-only">{t("label")}</SheetTitle>
          <Brand />
          <PersonalNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
