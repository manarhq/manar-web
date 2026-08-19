import { getTranslations } from "next-intl/server";

import { NotImplementedPage } from "@/components/manar/not-implemented";

export default async function SettingsSecurityPage() {
  const t = await getTranslations("nav.items");
  return <NotImplementedPage title={t("settingsSecurity")} />;
}
