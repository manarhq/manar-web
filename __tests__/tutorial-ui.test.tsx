import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TutorialHelpMenu } from "@/components/manar/tutorial/help-menu";
import { TutorialProvider } from "@/components/manar/tutorial/tutorial-provider";
import { storageKey } from "@/components/manar/tutorial/engine";
import en from "@/messages/en/tutorial.json";
import ar from "@/messages/ar/tutorial.json";

let pathname = "/overview";
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => pathname,
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const KEY = storageKey("acme", "user-1");

function renderTour({ roles = ["SECURITY_ADMIN"], locale = "en" as "en" | "ar" } = {}) {
  return render(
    <NextIntlClientProvider locale={locale} messages={{ tutorial: locale === "en" ? en : ar }}>
      <TutorialProvider scope="acme" userId="user-1" roles={roles}>
        <TutorialHelpMenu />
        <nav>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- stands in for the sidebar link */}
          <a href="/en/agents">Agents</a>
        </nav>
      </TutorialProvider>
    </NextIntlClientProvider>,
  );
}

function stored() {
  return JSON.parse(localStorage.getItem(KEY) ?? "null");
}

beforeEach(() => {
  localStorage.clear();
  pathname = "/overview";
});
afterEach(() => cleanup());

describe("console tutorial", () => {
  it("offers itself once, without a modal, and Not now is remembered", () => {
    renderTour();
    expect(screen.getByTestId("tour-offer")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: en.offer.later }));
    expect(screen.queryByTestId("tour-offer")).toBeNull();
    expect(stored().status).toBe("dismissed");

    cleanup();
    renderTour();
    expect(screen.queryByTestId("tour-offer")).toBeNull();
  });

  it("walks the steps with buttons and keys, announces each, and Esc pauses", () => {
    renderTour();
    fireEvent.click(screen.getByRole("button", { name: en.offer.start }));
    const card = screen.getByTestId("tour-card");
    expect(card).toHaveAttribute("aria-modal", "false");
    expect(card).toHaveFocus();
    expect(screen.getByTestId("tutorial-announcer")).toHaveTextContent(en.steps.welcome.title);

    fireEvent.keyDown(card, { key: "ArrowRight" });
    expect(screen.getByTestId("tour-card")).toHaveAttribute("data-tour-step", "labels");
    fireEvent.keyDown(screen.getByTestId("tour-card"), { key: "ArrowLeft" });
    expect(screen.getByTestId("tour-card")).toHaveAttribute("data-tour-step", "welcome");
    fireEvent.keyDown(screen.getByTestId("tour-card"), { key: "Enter" });
    expect(screen.getByTestId("tour-card")).toHaveAttribute("data-tour-step", "labels");

    fireEvent.keyDown(screen.getByTestId("tour-card"), { key: "Escape" });
    expect(screen.queryByTestId("tour-card")).toBeNull();
    expect(stored()).toMatchObject({ status: "paused", stepId: "labels" });
    expect(screen.getByTestId("tutorial-announcer")).toHaveTextContent(en.card.paused);
  });

  it("in Arabic the arrows follow reading direction", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ status: "paused", stepId: "labels", completed: [] }),
    );
    renderTour({ locale: "ar" });
    // Resume through the same path the Help menu uses.
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: ar.help.label }));
    });
    fireEvent.click(screen.getByRole("menuitem", { name: ar.help.resume }));
    const card = screen.getByTestId("tour-card");
    expect(card).toHaveTextContent(ar.steps.labels.title);
    fireEvent.keyDown(card, { key: "ArrowLeft" });
    expect(screen.getByTestId("tour-card")).toHaveAttribute("data-tour-step", "agentOpen");
  });

  it("a step whose target is missing is centred and says so", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ status: "paused", stepId: "auditVerify", completed: [] }),
    );
    renderTour();
    fireEvent.click(screen.getByRole("button", { name: en.help.label }));
    fireEvent.click(screen.getByRole("menuitem", { name: en.help.resume }));
    expect(screen.getByTestId("tour-card")).toHaveTextContent(en.card.notOnPage);
    expect(screen.getByRole("link", { name: en.card.goThere })).toHaveAttribute("href", "/audit");
  });

  it("a found target gets the ring and the card stays anchored to it", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ status: "paused", stepId: "agentOpen", completed: [] }),
    );
    renderTour();
    fireEvent.click(screen.getByRole("button", { name: en.help.label }));
    fireEvent.click(screen.getByRole("menuitem", { name: en.help.resume }));
    expect(screen.getByRole("link", { name: "Agents" })).toHaveAttribute("data-tour-active");
    expect(screen.getByTestId("tour-card")).not.toHaveTextContent(en.card.notOnPage);
    expect(screen.getByTestId("tour-card")).toHaveTextContent(en.card.yourTurn);
  });

  it("practice steps are labelled, never call the API, and complete on use", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    localStorage.setItem(
      KEY,
      JSON.stringify({ status: "paused", stepId: "killSwitch", completed: [] }),
    );
    renderTour();
    fireEvent.click(screen.getByRole("button", { name: en.help.label }));
    fireEvent.click(screen.getByRole("menuitem", { name: en.help.resume }));

    // The practice sandboxes load lazily (next/dynamic), so wait for them.
    const banner = await screen.findByTestId("practice-banner", {}, { timeout: 10_000 });
    expect(banner).toHaveTextContent(en.practice.banner);
    expect(banner).toHaveTextContent("DEMO FIXTURE");
    expect(screen.getByRole("button", { name: en.card.skip })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: en.practice.killSwitch.pull }));
    expect(screen.getByTestId("tour-card")).toHaveTextContent("agent_kill_switch_active");
    // Pulling alone does not finish the step: it has to be released too.
    expect(stored().completed).not.toContain("killSwitch");
    fireEvent.click(screen.getByRole("button", { name: en.practice.killSwitch.release }));
    expect(stored().completed).toContain("killSwitch");
    expect(screen.getByRole("button", { name: en.card.next })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("a practice decision shows the outcome, its reason and a policy version", async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ status: "paused", stepId: "decision", completed: [] }),
    );
    renderTour();
    fireEvent.click(screen.getByRole("button", { name: en.help.label }));
    fireEvent.click(screen.getByRole("menuitem", { name: en.help.resume }));
    fireEvent.click(
      (
        await screen.findAllByRole(
          "button",
          { name: en.practice.decision.send },
          { timeout: 10_000 },
        )
      )[2],
    );
    const card = screen.getByTestId("tour-card");
    expect(card).toHaveTextContent("DENY");
    expect(card).toHaveTextContent("forbidden_action");
    expect(card).toHaveTextContent("practice-v3");
  });

  it("an approver never sees the kill switch step", () => {
    renderTour({ roles: ["APPROVER"] });
    fireEvent.click(screen.getByRole("button", { name: en.offer.start }));
    const seen: string[] = [];
    for (let i = 0; i < 20 && screen.queryByTestId("tour-card"); i++) {
      seen.push(screen.getByTestId("tour-card").getAttribute("data-tour-step")!);
      fireEvent.keyDown(screen.getByTestId("tour-card"), { key: "ArrowRight" });
    }
    expect(seen).toContain("approval");
    expect(seen).not.toContain("killSwitch");
    expect(seen.at(-1)).toBe("finish");
    expect(stored().status).toBe("done");
  });
});
