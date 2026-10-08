import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { routing, isRtlLocale, type AppLocale } from "@/i18n/routing";
import { getSession } from "@/lib/auth/session.server";
import { PreferencesScript } from "@/components/manar/preferences/preferences-script";
import {
  normalizePreferenceScope,
  themeStorageKey,
} from "@/components/manar/preferences/preference-storage";
import { Providers } from "../providers";
import "../globals.css";

// IBM Plex (docs/design/DESIGN-SYSTEM.md section 3). app/globals.css puts Plex Sans Arabic
// first in the stack when <html lang="ar">, Plex Sans first otherwise.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  display: "swap",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Manar — SOC Console",
  description: "The operator console for the Manar Cybersecurity Operations Center.",
  robots: { index: false, follow: false, nocache: true },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enables static rendering for this locale's subtree (next-intl's
  // App Router requirement when `generateStaticParams` is used).
  setRequestLocale(locale as AppLocale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  // The signed-in tenant scopes both persisted operator preferences
  // (density, theme) so one tenant's choices never carry into the next
  // tenant signed in on the same browser profile — one origin serves
  // every tenant here, so localStorage would otherwise be shared. See
  // components/manar/preferences/preference-storage.ts.
  //
  // This reads the session cookie, which opts this subtree out of static
  // prerendering. That costs almost nothing in practice: everything under
  // (app) already read the session in its own layout, /[locale]/login was
  // already dynamic, and the only routes this actually changes are
  // /en and /ar, which do nothing but redirect to /overview.
  const session = await getSession();
  const preferenceScope = normalizePreferenceScope(session?.tenantSlug);

  return (
    <html
      lang={locale}
      dir={dir}
      // No theme class and no data-density here on purpose. Both are
      // client-only facts, so the server emits a neutral document and the
      // inline script in <head> below corrects it during parsing, before
      // the first paint. suppressHydrationWarning is what makes React
      // keep those script-applied attributes instead of treating them as
      // a hydration error — see
      // node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md.
      className={`${plexSans.variable} ${plexArabic.variable} ${plexMono.variable} h-full antialiased`}
      data-pref-scope={preferenceScope}
      suppressHydrationWarning
    >
      <head>
        <PreferencesScript scope={preferenceScope} />
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <Providers themeStorageKey={themeStorageKey(preferenceScope)}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
