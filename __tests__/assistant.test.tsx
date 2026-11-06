import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AssistantLauncher } from "@/components/manar/assistant/assistant-launcher";
import { openAssistant } from "@/components/manar/assistant/assistant-api";
import en from "@/messages/en/assistant.json";
import ar from "@/messages/ar/assistant.json";

const push = vi.hoisted(() => vi.fn());
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push }),
  usePathname: () => "/approvals",
}));

const fetchMock = vi.fn();
const ID = "11111111-2222-4333-8444-555555555555";

function renderLauncher(locale: "en" | "ar" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={{ assistant: locale === "en" ? en : ar }}>
      <AssistantLauncher scope="acme:op@example.com" />
    </NextIntlClientProvider>,
  );
}

function reply(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  push.mockReset();
  vi.unstubAllGlobals();
});

async function ask(text: string) {
  fireEvent.change(screen.getByLabelText(en.inputLabel), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: en.send }));
}

describe("assistant launcher", () => {
  it("has a top-bar trigger the tour can point at", () => {
    renderLauncher();
    const trigger = screen.getByRole("button", { name: en.triggerLabel });
    expect(trigger).toHaveAttribute("data-tour", "assistant");
  });

  it("opens with a prefilled question from the event, window.openAssistant and the export, and never sends it", async () => {
    renderLauncher();
    act(() => {
      window.dispatchEvent(
        new CustomEvent("manar:assistant:open", { detail: { prompt: "From the tour" } }),
      );
    });
    expect(await screen.findByLabelText(en.inputLabel)).toHaveValue("From the tour");

    act(() => window.openAssistant?.("From window"));
    await waitFor(() => expect(screen.getByLabelText(en.inputLabel)).toHaveValue("From window"));

    act(() => openAssistant("From the export"));
    await waitFor(() =>
      expect(screen.getByLabelText(en.inputLabel)).toHaveValue("From the export"),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("opens on Ctrl+J", async () => {
    renderLauncher();
    fireEvent.keyDown(window, { key: "j", ctrlKey: true });
    expect(await screen.findByText(en.description)).toBeInTheDocument();
  });
});

describe("assistant panel", () => {
  it("sends through the BFF and shows the answer with source links to console pages", async () => {
    renderLauncher();
    act(() => openAssistant());
    reply({
      available: true,
      answer: "One approval is waiting [1].",
      sources: [
        { ref: 1, kind: "approval", id: ID, label: "11111111", href: `/approvals/${ID}` },
        // Not a console page: must be dropped, never rendered as a link.
        { ref: 2, kind: "agent", id: ID, label: "evil", href: "https://evil.example/x" },
      ],
      suggestions: [],
      toolsUsed: ["list_pending_approvals"],
    });
    await ask("pending?");

    expect(await screen.findByText("One approval is waiting [1].")).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/bff/assistant/chat");
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      messages: [{ role: "user", content: "pending?" }],
      locale: "en",
      page: "/approvals",
    });
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([`/approvals/${ID}`]);
    expect(screen.queryByText("evil")).not.toBeInTheDocument();
  });

  it("a prepared action only navigates and highlights; it never calls a write endpoint", async () => {
    renderLauncher();
    act(() => openAssistant());
    reply({
      available: true,
      answer: "I cannot approve it. Use the button.",
      sources: [],
      suggestions: [
        {
          type: "highlight",
          label: "Review and decide yourself",
          href: `/approvals/${ID}`,
          target: "approve-button",
        },
      ],
    });
    await ask("approve it for me");
    const button = await screen.findByRole("button", { name: "Review and decide yourself" });
    // Fake timers only for the click: the highlight poll (200 ms, gives up after 8 s) runs on them,
    // so it cannot outlive this test and fire in the next one.
    vi.useFakeTimers();
    try {
      const others = vi.getTimerCount();
      fireEvent.click(button);
      fireEvent.click(button); // a second highlight replaces the first poll
      expect(vi.getTimerCount()).toBeGreaterThan(others);
      vi.advanceTimersByTime(8200); // the target never appears, so the poll stops itself
      expect(vi.getTimerCount()).toBeLessThanOrEqual(others);
    } finally {
      vi.useRealTimers();
    }

    expect(push).toHaveBeenCalledWith(`/approvals/${ID}`);
    // Only the one chat request ever went out.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.every(([u]) => u === "/api/bff/assistant/chat")).toBe(true);
  });

  it("says plainly when the assistant is unavailable", async () => {
    renderLauncher();
    act(() => openAssistant());
    reply({ available: false, reason: "model_unavailable" });
    await ask("hello");
    expect(await screen.findByRole("alert")).toHaveTextContent(en.unavailableTitle);
  });

  it("explains a rate limit", async () => {
    renderLauncher();
    act(() => openAssistant());
    reply({ reason: "assistant_rate_limited" }, 429);
    await ask("hello");
    expect(await screen.findByRole("alert")).toHaveTextContent(en.rateLimited);
  });

  it("keeps the conversation in this tab's session storage only, per tenant and user", async () => {
    renderLauncher();
    act(() => openAssistant());
    reply({ available: true, answer: "Hi", sources: [], suggestions: [] });
    await ask("hello");
    await screen.findByText("Hi");
    expect(sessionStorage.getItem("manar:assistant:acme:op@example.com")).toContain("hello");
    expect(localStorage.length).toBe(0);
  });

  it("renders in Arabic with the panel on the left", async () => {
    renderLauncher("ar");
    act(() => openAssistant());
    expect(await screen.findByText(ar.description)).toBeInTheDocument();
    expect(screen.getByText(ar.description).closest("[data-side]")).toHaveAttribute(
      "data-side",
      "left",
    );
  });
});

describe("assistant messages", () => {
  function keys(o: object, prefix = ""): string[] {
    return Object.entries(o).flatMap(([k, v]) =>
      typeof v === "object" ? keys(v as object, `${prefix}${k}.`) : [`${prefix}${k}`],
    );
  }
  function values(o: object): string[] {
    return Object.values(o).flatMap((v) => (typeof v === "object" ? values(v as object) : [v]));
  }

  it("has the same keys in English and Arabic", () => {
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });

  it("has no em or en dashes", () => {
    for (const v of [...values(en), ...values(ar)]) expect(v).not.toMatch(/[\u2013\u2014]/);
  });
});
