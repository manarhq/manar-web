import { setRequestLocale } from "next-intl/server";

import { NotificationsSettingsView } from "@/components/manar/settings/notifications-settings-view";
import type { AppLocale } from "@/i18n/routing";

export default async function SettingsNotificationsPage({
  params,
}: PageProps<"/[locale]/settings/notifications">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <NotificationsSettingsView />;
}
