import { getTranslations } from "next-intl/server";

import { NotImplementedPage } from "@/components/manar/not-implemented";

export default async function AgentsPage() {
  const t = await getTranslations("nav.items");
  return <NotImplementedPage title={t("agents")} />;
}
