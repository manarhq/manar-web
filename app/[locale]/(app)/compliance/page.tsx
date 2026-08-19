import { setRequestLocale } from "next-intl/server";

import { ComplianceView } from "@/components/manar/compliance/compliance-view";
import type { AppLocale } from "@/i18n/routing";

export default async function CompliancePage({ params }: PageProps<"/[locale]/compliance">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <ComplianceView />;
}
