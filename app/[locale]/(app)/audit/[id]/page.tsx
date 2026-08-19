import { getTranslations } from "next-intl/server";

import { NotImplementedPage } from "@/components/manar/not-implemented";

export default async function AuditDetailPage({ params }: PageProps<"/[locale]/audit/[id]">) {
  const { id } = await params;
  const t = await getTranslations("nav.items");
  return <NotImplementedPage title={`${t("audit")} · ${id}`} />;
}
