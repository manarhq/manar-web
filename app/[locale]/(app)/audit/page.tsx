import { setRequestLocale } from "next-intl/server";

import { AuditListView } from "@/components/manar/audit/audit-list-view";
import type { AppLocale } from "@/i18n/routing";

export default async function AuditPage({ params }: PageProps<"/[locale]/audit">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <AuditListView />;
}
