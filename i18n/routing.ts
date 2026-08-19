import { defineRouting } from "next-intl/routing";

/**
 * Manar ships English + Arabic from this foundation phase on (Section 59).
 * `localePrefix: "always"` keeps every URL unambiguous about which locale
 * rendered it (`/en/overview`, `/ar/overview`) rather than hiding the
 * default locale's prefix — this also makes the RTL verification the spec
 * asks for trivial to drive directly by URL instead of relying on
 * `Accept-Language` negotiation.
 */
export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];

/** Locales that read right-to-left — the single place this fact lives. */
export const RTL_LOCALES: readonly AppLocale[] = ["ar"];

export function isRtlLocale(locale: string): boolean {
  return (RTL_LOCALES as readonly string[]).includes(locale);
}
