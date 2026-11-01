import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InstallOnPhoneCard, TelegramCard } from "@/components/manar/settings/phone-cards";
import enSettings from "@/messages/en/settings.json";
import arSettings from "@/messages/ar/settings.json";

function wrap(ui: React.ReactElement, locale: "en" | "ar" = "en") {
  const settings = locale === "en" ? enSettings : arSettings;
  return render(
    <NextIntlClientProvider locale={locale} messages={{ settings }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe("phone cards", () => {
  it("has the same keys in English and Arabic", () => {
    const keys = (o: unknown, p = ""): string[] =>
      Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
        typeof v === "object" && v ? keys(v, `${p}${k}.`) : [`${p}${k}`],
      );
    expect(keys(arSettings.phone).sort()).toEqual(keys(enSettings.phone).sort());
  });

  it("shows install steps when the browser has no install prompt", () => {
    wrap(<InstallOnPhoneCard />);
    expect(screen.getByText("Install on your phone")).toBeTruthy();
    expect(screen.getByText("Choose Install app or Add to Home screen.")).toBeTruthy();
  });

  it("renders in Arabic", () => {
    wrap(<InstallOnPhoneCard />, "ar");
    expect(screen.getByText("ثبّت على هاتفك")).toBeTruthy();
  });

  it("says the bot is not available when the API reports it off", async () => {
    vi.stubGlobal("fetch", () => json({ enabled: false, linked: 0 }));
    wrap(<TelegramCard />);
    expect(await screen.findByText("Not available on this install yet.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Link Telegram" })).toBeNull();
  });

  it("shows the one-time code and unlinks", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${url}`);
      if (init?.method === "POST")
        return json({
          code: "ABCD-2345",
          url: "https://t.me/manar_bot?start=ABCD2345",
          expiresAt: new Date(Date.now() + 600_000).toISOString(),
        });
      if (init?.method === "DELETE") return Promise.resolve(new Response(null, { status: 204 }));
      return json({ enabled: true, linked: 0, botUsername: "manar_bot" });
    });
    wrap(<TelegramCard />);
    fireEvent.click(await screen.findByRole("button", { name: "Link Telegram" }));
    expect(await screen.findByText("/start ABCD2345")).toBeTruthy();
    expect(screen.getByText("In Telegram, open @manar_bot and send:")).toBeTruthy();
    expect(calls).toContain("POST /api/bff/telegram/link");
  });

  it("offers unlink when linked", async () => {
    vi.stubGlobal("fetch", (_u: string, init?: RequestInit) =>
      init?.method === "DELETE"
        ? Promise.resolve(new Response(null, { status: 204 }))
        : json({ enabled: true, linked: 1, botUsername: "manar_bot" }),
    );
    wrap(<TelegramCard />);
    fireEvent.click(await screen.findByRole("button", { name: "Unlink" }));
    await waitFor(() => expect(screen.getByText("Not linked.")).toBeTruthy());
  });
});
