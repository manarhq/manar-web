import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SharedSessionView } from "@/components/manar/insight/shared-session";
import { WeeklyReportCard } from "@/components/manar/personal/weekly-report-card";
import { fetchPublicReport } from "@/lib/personal/public-report";
import { toWeeklyReport } from "@/lib/personal/report";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/report/[shareId]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "features.public" });
  return {
    title: t("title"),
    description: t("ogDescription"),
    robots: { index: false, follow: false, nocache: true },
    openGraph: { title: t("title"), description: t("ogDescription"), type: "website" },
    twitter: { card: "summary_large_image", title: t("title"), description: t("ogDescription") },
  };
}

/** Public, no sign-in. Totals only; an unknown or revoked link is a 404. */
export default async function Page({ params }: PageProps<"/[locale]/report/[shareId]">) {
  const { locale, shareId } = await params;
  setRequestLocale(locale as AppLocale);
  const data = await fetchPublicReport(shareId);
  if (!data) notFound();
  const t = await getTranslations("features.public");
  return (
    <main className="mx-auto grid min-h-dvh max-w-xl content-center gap-4 p-4">
      {data.session ? (
        <SharedSessionView session={data.session} />
      ) : (
        <WeeklyReportCard report={toWeeklyReport(data)} />
      )}
      <p className="text-center text-sm text-muted-foreground">{t("made")}</p>
    </main>
  );
}
