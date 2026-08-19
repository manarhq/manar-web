import { setRequestLocale } from "next-intl/server";

import { OverviewDashboard } from "@/components/manar/overview/overview-dashboard";
import type { AppLocale } from "@/i18n/routing";

export default async function OverviewPage({ params }: PageProps<"/[locale]/overview">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  return <OverviewDashboard />;
}
