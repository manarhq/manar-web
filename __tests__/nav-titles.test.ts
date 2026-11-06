import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { NAV_GROUPS, SETTINGS_SUB_ITEMS } from "@/lib/nav-config";
import { PERSONAL_NAV } from "@/lib/personal/nav";

/**
 * A page's heading says what the nav item said (EN and AR). Each entry names the message the page
 * puts in its h1: `<namespace file>:<key path>`. Pages that reuse another view under a nav name
 * (personal Devices on /hosts, personal Activity on /activity) pass the nav label itself.
 */
const CONSOLE_TITLES: Record<string, string> = {
  "/overview": "overview:title",
  "/live": "live:title",
  "/friction": "features:friction.title",
  "/ai-systems": "aiSystems:title",
  "/agents": "agents:title",
  "/tasks": "tasks:title",
  "/tools": "tools:title",
  "/policies": "policies:title",
  "/approvals": "approvals:queue.title",
  "/audit": "audit:title",
  "/compliance": "compliance:title",
  "/hosts": "hosts:title",
  "/incidents": "incidents:title",
  "/integrations": "integrations:title",
  "/users": "users:title",
  "/roles": "roles:title",
  "/settings": "settings:index.title",
  "/settings/security": "settings:security.title",
  "/settings/sso": "settings:sso.title",
  "/settings/residency": "settings:residency.title",
  "/settings/ai": "settings:ai.title",
  "/settings/notifications": "settings:notifications.title",
  "/settings/profile": "growth:profile.title",
  "/settings/team": "growth:team.title",
  "/settings/account": "growth:account.title",
  "/settings/billing": "billing:title",
  "/settings/ai-usage": "aiUsage:title",
  "/settings/privacy": "privacy:title",
};

const PERSONAL_TITLES: Record<string, string> = {
  "/approvals": "approvals:queue.title",
  "/hosts": "personal:nav.devices",
  "/ai-tools": "personal:aiTools.title",
  "/mcp-servers": "insight:mcp.title",
  "/sessions": "insight:sessions.title",
  "/activity": "personal:nav.activity",
  "/rules": "features:rules.title",
  "/friction": "features:friction.title",
  "/settings": "settings:index.title",
};

function message(locale: string, ref: string): string {
  const [file, path] = ref.split(":");
  let node: unknown = JSON.parse(readFileSync(`messages/${locale}/${file}.json`, "utf8"));
  for (const key of path!.split(".")) node = (node as Record<string, unknown>)[key];
  return node as string;
}

describe.each(["en", "ar"])("page headings match the nav (%s)", (locale) => {
  it("console nav", () => {
    // /authorization renders nav.items.authorization itself.
    const items = [...NAV_GROUPS.flatMap((g) => g.items), ...SETTINGS_SUB_ITEMS].filter(
      (i) => i.href !== "/authorization",
    );
    for (const item of items) {
      const title = CONSOLE_TITLES[item.href];
      expect(title, item.href).toBeDefined();
      expect(message(locale, title!), item.href).toBe(
        message(locale, `nav:items.${item.labelKey}`),
      );
    }
  });

  it("personal nav", () => {
    for (const item of PERSONAL_NAV.filter((i) => i.href !== "/home")) {
      const title = PERSONAL_TITLES[item.href];
      expect(title, item.href).toBeDefined();
      expect(message(locale, title!), item.href).toBe(
        message(locale, `personal:nav.${item.labelKey}`),
      );
    }
  });
});
