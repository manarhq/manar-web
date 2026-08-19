import { setRequestLocale } from "next-intl/server";

import { AuditDetailView } from "@/components/manar/audit/audit-detail-view";
import type { AppLocale } from "@/i18n/routing";

export default async function AuditDetailPage({ params }: PageProps<"/[locale]/audit/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as AppLocale);
  return <AuditDetailView eventId={id} />;
}
