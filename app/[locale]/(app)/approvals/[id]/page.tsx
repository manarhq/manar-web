import { getTranslations } from "next-intl/server";

import { NotImplementedPage } from "@/components/manar/not-implemented";

export default async function ApprovalsDetailPage({
  params,
}: PageProps<"/[locale]/approvals/[id]">) {
  const { id } = await params;
  const t = await getTranslations("nav.items");
  return <NotImplementedPage title={`${t("approvals")} · ${id}`} />;
}
