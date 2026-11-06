import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";

import { NAMESPACES } from "./namespaces";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const modules = await Promise.all(
    NAMESPACES.map((namespace) =>
      import(`../messages/${locale}/${namespace}.json`).then((m) => m.default),
    ),
  );

  const messages = NAMESPACES.reduce<Record<string, unknown>>((acc, namespace, index) => {
    acc[namespace] = modules[index];
    return acc;
  }, {});

  return { locale, messages };
});
