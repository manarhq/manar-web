import { setRequestLocale } from "next-intl/server";

import { SitesView } from "@/components/manar/jail/sites-view";
import type { AppLocale } from "@/i18n/routing";

export default async function Page({ params }: PageProps<"/[locale]/ai-tools/sites">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <SitesView />;
}
