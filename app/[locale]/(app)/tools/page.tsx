import { getTranslations } from "next-intl/server";

import { NotImplementedPage } from "@/components/manar/not-implemented";

export default async function ToolsPage() {
  const t = await getTranslations("nav.items");
  return <NotImplementedPage title={t("tools")} />;
}
