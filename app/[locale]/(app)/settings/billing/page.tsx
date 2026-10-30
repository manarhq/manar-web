import { getTranslations, setRequestLocale } from "next-intl/server";

import { ComingSoon } from "@/components/manar/personal/coming-soon";
import type { AppLocale } from "@/i18n/routing";

// Placeholder: replace this file with the real page.
export default async function Page({ params }: PageProps<"/[locale]/settings/billing">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("personal.nav");
  return <ComingSoon title={t("settings")} />;
}
