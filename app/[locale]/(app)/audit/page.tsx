import { getTranslations } from "next-intl/server";

import { NotImplementedPage } from "@/components/manar/not-implemented";

export default async function AuditPage() {
  const t = await getTranslations("nav.items");
  return <NotImplementedPage title={t("audit")} />;
}
