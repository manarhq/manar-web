import { RouteMessages } from "@/components/manar/i18n/route-messages";
import { AppShell } from "@/components/manar/shell/app-shell";

/** The protected app shell (Section 60). Which chrome it draws, console or personal, is decided
 * by the workspace type in AppShell. */
export default async function AppShellLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  return (
    <RouteMessages area="(app)">
      <AppShell locale={locale}>{children}</AppShell>
    </RouteMessages>
  );
}
