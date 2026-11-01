import { setRequestLocale } from "next-intl/server";

import { AccountSettingsView } from "@/components/manar/growth/account-settings-view";
import type { AppLocale } from "@/i18n/routing";

export default async function Page({ params }: PageProps<"/[locale]/settings/account">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <AccountSettingsView />;
}
