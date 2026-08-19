import { setRequestLocale } from "next-intl/server";

import { IncidentDetailView } from "@/components/manar/incidents/incident-detail-view";
import type { AppLocale } from "@/i18n/routing";

export default async function IncidentsDetailPage({
  params,
}: PageProps<"/[locale]/incidents/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as AppLocale);
  return <IncidentDetailView incidentId={id} />;
}
