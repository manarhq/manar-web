import { setRequestLocale } from "next-intl/server";

import { IntegrationsView } from "@/components/manar/integrations/integrations-view";
import type { AppLocale } from "@/i18n/routing";

export default async function IntegrationsPage({ params }: PageProps<"/[locale]/integrations">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <IntegrationsView />;
}
