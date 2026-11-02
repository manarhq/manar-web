import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";

import { routing } from "./routing";

/** Message namespaces this foundation phase produces. Each is a separate
 * JSON file under messages/{locale}/ so later phases can add their own
 * namespace file without touching this list's existing entries — only
 * appending to it here. */
const NAMESPACES = [
  "common",
  "nav",
  "commandPalette",
  "risk",
  "dataTable",
  "auth",
  "overview",
  "errors",
  "agents",
  "tasks",
  "approvals",
  "live",
  "tools",
  "policies",
  "audit",
  "users",
  "roles",
  "settings",
  "incidents",
  "compliance",
  "integrations",
  "aiSystems",
  "tutorial",
  "assistant",
  "hosts",
  "personal",
  "billing",
  "planLimit",
  "addDevice",
  "features",
  "cloudAgents",
  "workspace",
  "signIn",
  "insight",
  "growth",
  "privacy",
] as const;

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
