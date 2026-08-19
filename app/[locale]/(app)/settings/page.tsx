import { getTranslations } from "next-intl/server";

import { NotImplementedPage } from "@/components/manar/not-implemented";

export default async function SettingsPage() {
  const t = await getTranslations("nav.items");
  return <NotImplementedPage title={t("settings")} />;
}
