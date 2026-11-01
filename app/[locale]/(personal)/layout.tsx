import { SampleBanner } from "@/components/manar/features/sample-banner";
import { AppShell } from "@/components/manar/shell/app-shell";

/**
 * Pages that belong to the personal workspace (Home, Activity, and the pages the other launch
 * tracks add here). They render through the same AppShell as the console group, so a company
 * workspace that opens one of these URLs still gets the console chrome.
 */
export default async function PersonalLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  return (
    <AppShell locale={locale}>
      <SampleBanner />
      {children}
    </AppShell>
  );
}
