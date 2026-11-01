import { setRequestLocale } from "next-intl/server";

import { ProfileSettingsView } from "@/components/manar/growth/profile-settings-view";
import type { AppLocale } from "@/i18n/routing";

export default async function Page({ params }: PageProps<"/[locale]/settings/profile">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <ProfileSettingsView />;
}
