import { getTranslations } from "next-intl/server";

import { NotImplementedPage } from "@/components/manar/not-implemented";

export default async function AuthorizationDetailPage({
  params,
}: PageProps<"/[locale]/authorization/[id]">) {
  const { id } = await params;
  const t = await getTranslations("nav.items");
  return <NotImplementedPage title={`${t("authorization")} · ${id}`} />;
}
