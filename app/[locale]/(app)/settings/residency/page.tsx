import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccessDeniedPanel } from "@/components/manar/access-denied-panel";
import { ResidencySettingsView } from "@/components/manar/settings/residency-settings-view";
import { getSession } from "@/lib/auth/session.server";
import { isRoleManager } from "@/lib/roles";
import type { AppLocale } from "@/i18n/routing";

export default async function SettingsResidencyPage({
  params,
}: PageProps<"/[locale]/settings/residency">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  const session = await getSession();
  if (!session || !isRoleManager(session.roles)) {
    const t = await getTranslations("settings");
    const tNav = await getTranslations("nav.items");
    return <AccessDeniedPanel title={tNav("settingsResidency")} body={t("accessDeniedBody")} />;
  }

  return <ResidencySettingsView />;
}
