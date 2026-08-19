import { setRequestLocale } from "next-intl/server";

import { SettingsIndexView } from "@/components/manar/settings/settings-index-view";
import type { AppLocale } from "@/i18n/routing";

export default async function SettingsPage({ params }: PageProps<"/[locale]/settings">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <SettingsIndexView />;
}
