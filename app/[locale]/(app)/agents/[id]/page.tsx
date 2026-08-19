import { getTranslations } from "next-intl/server";

import { NotImplementedPage } from "@/components/manar/not-implemented";

export default async function AgentsDetailPage({ params }: PageProps<"/[locale]/agents/[id]">) {
  const { id } = await params;
  const t = await getTranslations("nav.items");
  return <NotImplementedPage title={`${t("agents")} · ${id}`} />;
}
