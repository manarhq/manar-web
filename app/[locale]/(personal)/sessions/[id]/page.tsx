import { setRequestLocale } from "next-intl/server";

import { SessionDetailView } from "@/components/manar/insight/session-detail-view";
import type { AppLocale } from "@/i18n/routing";

export default async function Page({ params }: PageProps<"/[locale]/sessions/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as AppLocale);
  return <SessionDetailView id={id} />;
}
