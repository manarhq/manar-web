import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccessDeniedPanel } from "@/components/manar/access-denied-panel";
import { AiSettingsView } from "@/components/manar/settings/ai-settings-view";
import { getMe } from "@/lib/auth/me.server";
import { isRoleManager } from "@/lib/roles";
import type { AppLocale } from "@/i18n/routing";

export default async function SettingsAiPage({ params }: PageProps<"/[locale]/settings/ai">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  const me = await getMe();
  if (!me || !isRoleManager(me.roles)) {
    const t = await getTranslations("settings");
    const tNav = await getTranslations("nav.items");
    return <AccessDeniedPanel title={tNav("settingsAi")} body={t("accessDeniedBody")} />;
  }

  return <AiSettingsView />;
}
