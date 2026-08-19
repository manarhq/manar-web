import { getTranslations } from "next-intl/server";

import { NotImplementedPage } from "@/components/manar/not-implemented";

export default async function PoliciesPage() {
  const t = await getTranslations("nav.items");
  return <NotImplementedPage title={t("policies")} />;
}
