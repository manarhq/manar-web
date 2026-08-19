import { redirect } from "@/i18n/navigation";

/** The bare locale root (`/en`, `/ar`) has nothing of its own to show —
 * it always forwards to `/overview`. Unauthenticated visitors never
 * actually see `/overview` render: `proxy.ts` intercepts protected routes
 * first and redirects to `/login` instead. */
export default async function LocaleRootPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  redirect({ href: "/overview", locale });
}
