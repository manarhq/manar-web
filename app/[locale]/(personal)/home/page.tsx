import { setRequestLocale } from "next-intl/server";

import { HomeWithReport } from "@/components/manar/features/home-report";
import type { AppLocale } from "@/i18n/routing";

export default async function HomePage({ params }: PageProps<"/[locale]/home">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <HomeWithReport />;
}
