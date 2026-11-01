import { AppShell } from "@/components/manar/shell/app-shell";

/** The protected app shell (Section 60). Which chrome it draws, console or personal, is decided
 * by the workspace type in AppShell. */
export default async function AppShellLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  return <AppShell locale={locale}>{children}</AppShell>;
}
