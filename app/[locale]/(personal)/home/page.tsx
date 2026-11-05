import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { setRequestLocale } from "next-intl/server";

import { HomeWithReport } from "@/components/manar/features/home-report";
import { prefetchHome } from "@/lib/server-prefetch.server";
import type { AppLocale } from "@/i18n/routing";

export default async function HomePage({ params }: PageProps<"/[locale]/home">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const queryClient = new QueryClient();
  await prefetchHome(queryClient);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeWithReport extendedGrants />
    </HydrationBoundary>
  );
}
