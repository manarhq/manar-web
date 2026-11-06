import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AiDefaultNotice } from "@/components/manar/ai-default-notice";
import en from "@/messages/en/common.json";
import ar from "@/messages/ar/common.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);
afterEach(() => {
  cleanup();
  fetchMock.mockReset();
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function renderNotice(isAdmin: boolean, locale: "en" | "ar" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={{ common: locale === "en" ? en : ar }}>
      <QueryClientProvider client={new QueryClient()}>
        <AiDefaultNotice isAdmin={isAdmin} />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

describe("AI default notice", () => {
  it.each([
    ["en", en.aiDefaultNotice],
    ["ar", ar.aiDefaultNotice],
  ] as const)(
    "shows once to an admin, with a link, and dismisses on the server (%s)",
    async (locale, text) => {
      fetchMock.mockResolvedValueOnce(json({ aiDefaultNoticePending: true }));
      renderNotice(true, locale);
      expect(await screen.findByText(text.title)).toBeInTheDocument();
      expect(screen.getByText(text.body, { exact: false })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: text.link })).toHaveAttribute("href", "/settings/ai");
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
      fireEvent.click(screen.getByRole("button", { name: text.dismiss }));
      await waitFor(() => expect(screen.queryByText(text.title)).toBeNull());
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/bff/tenant/settings/ai-default-notice/dismiss",
        expect.objectContaining({ method: "POST" }),
      );
    },
  );

  it.each([
    ["en", en.aiOptInNotice],
    ["ar", ar.aiOptInNotice],
  ] as const)(
    "asks an admin whether to turn AI on when the history could not prove their choice (%s)",
    async (locale, text) => {
      fetchMock.mockResolvedValueOnce(
        json({ aiDefaultNoticePending: false, aiOptInNoticePending: true }),
      );
      renderNotice(true, locale);
      expect(await screen.findByText(text.title)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: text.link })).toHaveAttribute("href", "/settings/ai");
    },
  );

  it("shows nothing when nothing is pending, and never asks for a non-admin", async () => {
    fetchMock.mockResolvedValueOnce(json({ aiDefaultNoticePending: false }));
    renderNotice(true);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(en.aiDefaultNotice.title)).toBeNull();
    cleanup();
    fetchMock.mockClear();
    renderNotice(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
