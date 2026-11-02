import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/manar/page-header";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { SETTINGS_SUB_ITEMS } from "@/lib/nav-config";

const GROWTH_KEYS: Record<string, "profile" | "team" | "account" | "billing"> = {
  "/settings/profile": "profile",
  "/settings/team": "team",
  "/settings/account": "account",
  "/settings/billing": "billing",
};

const CARD_KEYS: Record<
  string,
  "security" | "sso" | "residency" | "ai" | "notifications" | "privacy"
> = {
  "/settings/privacy": "privacy",
  "/settings/security": "security",
  "/settings/sso": "sso",
  "/settings/residency": "residency",
  "/settings/ai": "ai",
  "/settings/notifications": "notifications",
};

/** `/settings` (Phase 14): a plain navigation index into the four
 * tenant-settings sub-pages, each of which enforces its own
 * `TENANT_OWNER`/`SECURITY_ADMIN` access check individually — this index
 * itself needs nothing from the gated API, so it stays visible to every
 * signed-in user (consistent with the sidebar always showing the
 * `/settings` nav entry regardless of role). */
export async function SettingsIndexView() {
  const t = await getTranslations("settings.index");
  const g = await getTranslations("growth.settingsCards");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SETTINGS_SUB_ITEMS.map((item) => {
          const growth = GROWTH_KEYS[item.href];
          const key = CARD_KEYS[item.href];
          if (!key && !growth) return null;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <item.icon className="size-4 text-muted-foreground" aria-hidden />
                    <CardTitle>
                      {growth ? g(`${growth}.title`) : t(`cards.${key!}.title`)}
                    </CardTitle>
                  </div>
                  <CardDescription>
                    {growth ? g(`${growth}.description`) : t(`cards.${key!}.description`)}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
