import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccessDeniedPanel } from "@/components/manar/access-denied-panel";
import { SecuritySettingsView } from "@/components/manar/settings/security-settings-view";
import { getSession } from "@/lib/auth/session.server";
import { isRoleManager } from "@/lib/roles";
import type { AppLocale } from "@/i18n/routing";

export default async function SettingsSecurityPage({
  params,
}: PageProps<"/[locale]/settings/security">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  const session = await getSession();
  // GET/PATCH /tenant/settings are gated server-side to TENANT_OWNER/
  // SECURITY_ADMIN (Phase 14) — checked here too so a lower-privileged
  // viewer sees a real "access denied" state instead of a failed fetch.
  if (!session || !isRoleManager(session.roles)) {
    const t = await getTranslations("settings");
    const tNav = await getTranslations("nav.items");
    return <AccessDeniedPanel title={tNav("settingsSecurity")} body={t("accessDeniedBody")} />;
  }

  return <SecuritySettingsView />;
}
