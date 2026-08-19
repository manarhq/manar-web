import { setRequestLocale } from "next-intl/server";

import { TasksListView } from "@/components/manar/tasks/tasks-list-view";
import type { AppLocale } from "@/i18n/routing";

export default async function TasksPage({ params }: PageProps<"/[locale]/tasks">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <TasksListView />;
}
