import { setRequestLocale } from "next-intl/server";

import { TeamSettingsView } from "@/components/manar/growth/team-settings-view";
import type { AppLocale } from "@/i18n/routing";

export default async function Page({ params }: PageProps<"/[locale]/settings/team">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <TeamSettingsView />;
}
