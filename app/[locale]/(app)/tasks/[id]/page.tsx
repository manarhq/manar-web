import { getTranslations } from "next-intl/server";

import { NotImplementedPage } from "@/components/manar/not-implemented";

export default async function TasksDetailPage({ params }: PageProps<"/[locale]/tasks/[id]">) {
  const { id } = await params;
  const t = await getTranslations("nav.items");
  return <NotImplementedPage title={`${t("tasks")} · ${id}`} />;
}
