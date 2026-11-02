import { setRequestLocale } from "next-intl/server";

import { PrivacySettingsView } from "@/components/manar/privacy/privacy-settings-view";
import { getMe } from "@/lib/auth/me.server";
import { isRoleManager } from "@/lib/roles";
import type { AppLocale } from "@/i18n/routing";

export default async function SettingsPrivacyPage({
  params,
}: PageProps<"/[locale]/settings/privacy">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  // Roles and the workspace type come from manar-api, never the session. Only Company (and
  // Government) workspaces have workspace switches; manar-api answers 403 for anything else.
  const me = await getMe();
  const showWorkspace = !!me && me.workspace.kind === "COMPANY" && isRoleManager(me.roles);

  return <PrivacySettingsView showWorkspace={showWorkspace} />;
}
