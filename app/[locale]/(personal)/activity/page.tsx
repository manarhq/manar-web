import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuditListView } from "@/components/manar/audit/audit-list-view";
import type { AppLocale } from "@/i18n/routing";

/** Activity is the audit view under a friendlier name; it reuses the audit list, titled as the nav item. */
export default async function ActivityPage({ params }: PageProps<"/[locale]/activity">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("personal.nav");
  return <AuditListView title={t("activity")} />;
}
