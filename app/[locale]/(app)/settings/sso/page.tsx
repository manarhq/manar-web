import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccessDeniedPanel } from "@/components/manar/access-denied-panel";
import { SsoSettingsView } from "@/components/manar/settings/sso-settings-view";
import { getSession } from "@/lib/auth/session.server";
import { isRoleManager } from "@/lib/roles";
import type { AppLocale } from "@/i18n/routing";

export default async function SettingsSsoPage({ params }: PageProps<"/[locale]/settings/sso">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  const session = await getSession();
  if (!session || !isRoleManager(session.roles)) {
    const t = await getTranslations("settings");
    const tNav = await getTranslations("nav.items");
    return <AccessDeniedPanel title={tNav("settingsSso")} body={t("accessDeniedBody")} />;
  }

  return <SsoSettingsView />;
}
