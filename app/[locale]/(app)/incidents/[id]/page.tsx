import { getTranslations } from "next-intl/server";

import { NotImplementedPage } from "@/components/manar/not-implemented";

export default async function IncidentsDetailPage({
  params,
}: PageProps<"/[locale]/incidents/[id]">) {
  const { id } = await params;
  const t = await getTranslations("nav.items");
  return <NotImplementedPage title={`${t("incidents")} · ${id}`} />;
}
