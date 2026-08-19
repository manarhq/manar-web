import { setRequestLocale } from "next-intl/server";

import { IncidentsListView } from "@/components/manar/incidents/incidents-list-view";
import type { AppLocale } from "@/i18n/routing";

export default async function IncidentsPage({ params }: PageProps<"/[locale]/incidents">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <IncidentsListView />;
}
