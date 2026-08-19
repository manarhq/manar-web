import { setRequestLocale } from "next-intl/server";

import { TaskDetailView } from "@/components/manar/tasks/task-detail-view";
import type { AppLocale } from "@/i18n/routing";

export default async function TasksDetailPage({ params }: PageProps<"/[locale]/tasks/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as AppLocale);
  return <TaskDetailView taskId={id} />;
}
