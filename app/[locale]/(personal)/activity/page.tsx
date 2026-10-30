import { setRequestLocale } from "next-intl/server";

import { AuditListView } from "@/components/manar/audit/audit-list-view";
import type { AppLocale } from "@/i18n/routing";

/** Activity is the audit view under a friendlier name; it reuses the audit list as is. */
export default async function ActivityPage({ params }: PageProps<"/[locale]/activity">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <AuditListView />;
}
