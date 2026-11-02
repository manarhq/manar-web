import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataNotice } from "@/components/manar/privacy/data-notice";
import { PrivacySettingsView } from "@/components/manar/privacy/privacy-settings-view";
import { setTrackingEnabled, track, trackClientError } from "@/lib/telemetry/track";
import privacyAr from "@/messages/ar/privacy.json";
import privacyEn from "@/messages/en/privacy.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...p }: { href: string; children: ReactNode }) => (
    <a href={href} {...p}>
      {children}
    </a>
  ),
}));

const prefs = (over: Record<string, unknown> = {}) => ({
  improveManar: true,
  aiTraining: true,
  org: null,
  effective: { improveManar: true, aiTraining: true },
  noticeDismissed: false,
  ...over,
});

let calls: Array<{ url: string; method: string; body?: string }>;
let responses: Record<string, { status?: number; body: unknown }>;

beforeEach(() => {
  calls = [];
  responses = {};
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      calls.push({ url, method, body: init?.body as string | undefined });
      const r = responses[`${method} ${url}`] ?? { status: method === "PUT" ? 204 : 404, body: {} };
      return new Response(r.status === 204 ? null : JSON.stringify(r.body), {
        status: r.status ?? 200,
      });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  setTrackingEnabled(false);
});

function wrap(ui: ReactNode, locale: "en" | "ar" = "en") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={{ privacy: locale === "en" ? privacyEn : privacyAr }}
    >
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

const ME = "GET /api/bff/me/data-preferences";
const putMe = () =>
  calls.filter((c) => c.method === "PUT" && c.url.endsWith("/me/data-preferences"));

describe("privacy messages", () => {
  it("has matching keys in English and Arabic", () => {
    const keys = (o: unknown, p = ""): string[] =>
      typeof o === "object" && o
        ? Object.entries(o).flatMap(([k, v]) => keys(v, p ? `${p}.${k}` : k))
        : [p];
    expect(keys(privacyAr).sort()).toEqual(keys(privacyEn).sort());
  });
});

describe("user switches", () => {
  it("render and PUT the right body", async () => {
    responses[ME] = { body: prefs() };
    wrap(<PrivacySettingsView showWorkspace={false} />);
    const improve = await screen.findByRole("switch", { name: /Help improve Manar/ });
    expect(improve).toBeChecked();
    fireEvent.click(improve);
    await waitFor(() => expect(putMe()).toHaveLength(1));
    expect(JSON.parse(putMe()[0].body!)).toEqual({ improveManar: false });
    fireEvent.click(screen.getByRole("switch", { name: /train Manar/ }));
    await waitFor(() => expect(putMe()).toHaveLength(2));
    expect(JSON.parse(putMe()[1].body!)).toEqual({ aiTraining: false });
    expect(screen.getByRole("link", { name: "Read the Privacy Policy" })).toHaveAttribute(
      "href",
      "https://manar.fixio.ae/en/privacy",
    );
  });

  it("disables AI training, with a reason, while improve is off", async () => {
    responses[ME] = {
      body: prefs({ improveManar: false, effective: { improveManar: false, aiTraining: false } }),
    };
    wrap(<PrivacySettingsView showWorkspace={false} />);
    const training = await screen.findByRole("switch", { name: /train Manar/ });
    expect(training).toHaveAttribute("data-disabled");
    expect(training).toHaveAttribute("data-unchecked");
    expect(screen.getByText("Turn on Help improve Manar to use this.")).toBeInTheDocument();
  });

  it("shows an org override as off and locked", async () => {
    responses[ME] = {
      body: prefs({
        org: { improveManar: false, aiTraining: false },
        effective: { improveManar: false, aiTraining: false },
      }),
    };
    wrap(<PrivacySettingsView showWorkspace={false} />);
    const improve = await screen.findByRole("switch", { name: /Help improve Manar/ });
    expect(improve).toHaveAttribute("data-disabled");
    expect(improve).toHaveAttribute("data-unchecked");
    expect(screen.getAllByText("Turned off by your organisation").length).toBe(2);
  });

  it("renders in Arabic", async () => {
    responses[ME] = { body: prefs() };
    wrap(<PrivacySettingsView showWorkspace={false} />, "ar");
    expect(await screen.findByRole("switch", { name: /ساعد في تحسين منار/ })).toBeInTheDocument();
  });
});

describe("workspace switches", () => {
  it("show for managers on a company workspace and PUT the pair", async () => {
    responses[ME] = { body: prefs() };
    responses["GET /api/bff/workspace/data-preferences"] = {
      body: { improveManar: true, aiTraining: true },
    };
    wrap(<PrivacySettingsView showWorkspace />);
    fireEvent.click(await screen.findByRole("switch", { name: /Use workspace data/ }));
    await waitFor(() =>
      expect(
        calls.some((c) => c.method === "PUT" && c.url.endsWith("/workspace/data-preferences")),
      ).toBe(true),
    );
    const put = calls.find(
      (c) => c.method === "PUT" && c.url.endsWith("/workspace/data-preferences"),
    )!;
    expect(JSON.parse(put.body!)).toEqual({ improveManar: true, aiTraining: false });
  });

  it("are not requested or shown when the caller is not a manager or the workspace is personal", async () => {
    responses[ME] = { body: prefs() };
    wrap(<PrivacySettingsView showWorkspace={false} />);
    await screen.findByRole("switch", { name: /Help improve Manar/ });
    expect(screen.queryByText("Workspace choices")).toBeNull();
    expect(calls.some((c) => c.url.includes("/workspace/data-preferences"))).toBe(false);
  });

  it("show nothing when the API answers 403", async () => {
    responses[ME] = { body: prefs() };
    responses["GET /api/bff/workspace/data-preferences"] = { status: 403, body: {} };
    wrap(<PrivacySettingsView showWorkspace />);
    await screen.findByRole("switch", { name: /Help improve Manar/ });
    await waitFor(() =>
      expect(calls.some((c) => c.url.includes("/workspace/data-preferences"))).toBe(true),
    );
    expect(screen.queryByText("Workspace choices")).toBeNull();
  });
});

describe("sign-up notice", () => {
  it("shows once and dismisses through the API", async () => {
    responses[ME] = { body: prefs() };
    wrap(<DataNotice />);
    expect(await screen.findByText(/collects product data/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "https://manar.fixio.ae/en/privacy",
    );
    expect(screen.getByRole("link", { name: "Privacy and data settings" })).toHaveAttribute(
      "href",
      "/settings/privacy",
    );
    responses[ME] = { body: prefs({ noticeDismissed: true }) };
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    await waitFor(() => expect(putMe()).toHaveLength(1));
    expect(JSON.parse(putMe()[0].body!)).toEqual({ noticeDismissed: true });
    await waitFor(() => expect(screen.queryByText(/collects product data/)).toBeNull());
  });

  it("does not show when already dismissed", async () => {
    responses[ME] = { body: prefs({ noticeDismissed: true }) };
    wrap(<DataNotice />);
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(screen.queryByText(/collects product data/)).toBeNull();
  });
});

describe("track()", () => {
  it("sends nothing while the effective flag is off", () => {
    const beacon = vi.fn(() => true);
    vi.stubGlobal("navigator", { sendBeacon: beacon });
    track("page_view", { route: "/home" });
    expect(beacon).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });

  it("uses sendBeacon when on, falling back to fetch", () => {
    setTrackingEnabled(true);
    const beacon = vi.fn(() => true);
    vi.stubGlobal("navigator", { sendBeacon: beacon });
    track("device_added");
    expect(beacon).toHaveBeenCalledWith("/api/bff/telemetry/events", expect.any(Blob));
    vi.stubGlobal("navigator", { sendBeacon: () => false });
    track("device_added");
    expect(calls.at(-1)).toMatchObject({ url: "/api/bff/telemetry/events", method: "POST" });
  });

  it("client_error carries the route and error name, never the message", () => {
    setTrackingEnabled(true);
    vi.stubGlobal("navigator", { sendBeacon: () => false });
    const err = new TypeError("secret-token-abc leaked in message");
    err.stack = "TypeError: secret-token-abc\n at x";
    trackClientError("/sessions/3f2a9c1e-1111-2222-3333-444455556666", err);
    const body = calls.at(-1)!.body!;
    expect(JSON.parse(body).events[0]).toMatchObject({
      name: "client_error",
      props: { route: "/sessions/:id", error: "TypeError" },
    });
    expect(body).not.toContain("secret-token");
    expect(body).not.toContain("leaked");
  });
});
