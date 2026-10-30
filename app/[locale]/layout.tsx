import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { JetBrains_Mono, Readex_Pro } from "next/font/google";
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

// Readex Pro covers Latin and Arabic in one family; JetBrains Mono is the monospace face
// (docs/design/DESIGN-SYSTEM.md section 3).
const readex = Readex_Pro({
  variable: "--font-readex",
  subsets: ["latin", "arabic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Manar: AI agent governance",
  description:
    "The Manar console: every AI agent action checked, approved when it must be, and recorded.",
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
  // Set by proxy.ts with the request's CSP; inline scripts run only with it.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

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
      className={`${readex.variable} ${jetbrainsMono.variable} h-full antialiased`}
      data-pref-scope={preferenceScope}
      suppressHydrationWarning
    >
      <head>
        <PreferencesScript scope={preferenceScope} nonce={nonce} />
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <Providers themeStorageKey={themeStorageKey(preferenceScope)} nonce={nonce}>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
