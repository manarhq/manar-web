import { getHomeHref } from "@/lib/home-href";
import { redirect } from "@/i18n/navigation";

/** The bare locale root (`/en`, `/ar`) has nothing of its own to show: it forwards to the
 * workspace's home (`/home` for personal workspaces, `/overview` for the console).
 * Unauthenticated visitors never actually see either: `proxy.ts` intercepts protected routes
 * first and redirects to `/login` instead. */
export default async function LocaleRootPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  redirect({ href: await getHomeHref(), locale });
}
