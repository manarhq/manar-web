import { getTranslations } from "next-intl/server";

import { NotImplementedPage } from "@/components/manar/not-implemented";

export default async function PoliciesDetailPage({ params }: PageProps<"/[locale]/policies/[id]">) {
  const { id } = await params;
  const t = await getTranslations("nav.items");
  return <NotImplementedPage title={`${t("policies")} · ${id}`} />;
}
