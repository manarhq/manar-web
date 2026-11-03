import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";

import { TamperNotice } from "@/components/manar/hosts/tamper-notice";
import { tamperKey } from "@/lib/hosts/tamper";
import hostsAr from "@/messages/ar/hosts.json";
import hostsEn from "@/messages/en/hosts.json";

afterEach(cleanup);

function show(locale: "en" | "ar", kind: string, maskedPath: string | null) {
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={{ hosts: locale === "en" ? hostsEn : hostsAr }}
      now={new Date("2026-11-03T08:00:00Z")}
      timeZone="UTC"
    >
      <TamperNotice
        tamper={{ at: "2026-11-03T07:00:00Z", kind, toolId: "host.claude-code", maskedPath }}
      />
    </NextIntlClientProvider>,
  );
}

describe("tampered device", () => {
  it("says what happened, where and when, in plain words", () => {
    show("en", "protect.tamper.hooks_disabled", "~/app/.claude/settings.local.json");
    expect(screen.getByText("Tampered")).toBeTruthy();
    expect(screen.getByText(/switch off all hooks/)).toBeTruthy();
    expect(screen.getByText("~/app/.claude/settings.local.json")).toBeTruthy();
    expect(screen.getByText(/Last reported/)).toBeTruthy();
  });

  it("has an Arabic text for every kind, and a kind from a newer API reads as the generic one", () => {
    for (const kind of [
      "settings_write",
      "hook_removed",
      "hooks_disabled",
      "settings_flag",
      "config_dir",
    ]) {
      expect(tamperKey(`protect.tamper.${kind}`)).toBe(kind);
    }
    expect(tamperKey("protect.tamper.new_thing")).toBe("unknown");
    show("ar", "protect.tamper.settings_write", null);
    expect(screen.getByText("تم التلاعب")).toBeTruthy();
    expect(screen.getByText(/فمنعها منار/)).toBeTruthy();
  });
});
