import { setRequestLocale } from "next-intl/server";

import { LiveFeedView } from "@/components/manar/live/live-feed-view";
import type { AppLocale } from "@/i18n/routing";

export default async function LivePage({ params }: PageProps<"/[locale]/live">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return <LiveFeedView />;
}
