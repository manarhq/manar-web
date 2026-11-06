import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { niceMax } from "@/components/manar/ai-usage/ai-usage-chart";
import { AiUsageView } from "@/components/manar/ai-usage/ai-usage-view";
import type { DailyAiUsage } from "@/hooks/use-billing";
import en from "@/messages/en/aiUsage.json";
import ar from "@/messages/ar/aiUsage.json";

const hook = vi.hoisted(() => ({ value: {} as unknown, days: [] as number[] }));
vi.mock("@/hooks/use-billing", () => ({
  useDailyAiUsage: (days: number) => {
    hook.days.push(days);
    return hook.value;
  },
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function usage(): DailyAiUsage {
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(Date.UTC(2026, 9, 7 + i)).toISOString().slice(0, 10);
    const fromAllowance = i % 5 === 0 ? 0 : i % 7;
    const fromCredits = i === 29 ? 3 : 0;
    return { date, actions: fromAllowance + fromCredits, fromAllowance, fromCredits };
  });
  const sum = (k: "actions" | "fromAllowance" | "fromCredits") =>
    days.reduce((a, d) => a + d[k], 0);
  return {
    from: days[0]!.date,
    to: days.at(-1)!.date,
    days,
    totals: {
      actions: sum("actions"),
      fromAllowance: sum("fromAllowance"),
      fromCredits: sum("fromCredits"),
    },
    month: {
      month: "2026-11",
      plan: "pro",
      used: 52,
      included: 100,
      creditsSpent: 3,
      creditBalance: 997,
    },
  };
}

function view(locale: "en" | "ar" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={{ aiUsage: locale === "en" ? en : ar }}>
      <AiUsageView />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  hook.days = [];
});

describe("AI usage page", () => {
  it("shows the period totals and the month figures the billing page shows", () => {
    const data = usage();
    hook.value = { isPending: false, isError: false, data };
    view();
    expect(screen.getByText(en.cards.total).nextSibling).toHaveTextContent(
      String(data.totals.actions),
    );
    expect(screen.getByText(en.cards.credits).nextSibling).toHaveTextContent("3");
    expect(screen.getByText("52 of 100 included actions used")).toBeInTheDocument();
    expect(screen.getByText(/3 credits spent this month/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.billingLink })).toHaveAttribute(
      "href",
      "/settings/billing",
    );
  });

  it("is a chart with an accessible name and a full description, never colour alone", () => {
    hook.value = { isPending: false, isError: false, data: usage() };
    view();
    const chart = screen.getByRole("img", { name: en.chart.title });
    expect(chart).toHaveAccessibleDescription(
      /69 actions over 30 days\. Busiest day: Oct 13, 2026, 6 actions\./,
    );
    // Credits differ from the allowance by a hatch pattern as well as by fill.
    expect(chart.querySelector("pattern")).not.toBeNull();
    expect(screen.getByText(en.chart.legendAllowance)).toBeInTheDocument();
    expect(screen.getByText(en.chart.legendCredits)).toBeInTheDocument();
  });

  it("offers the same numbers as a table with headers and a caption", () => {
    const data = usage();
    hook.value = { isPending: false, isError: false, data };
    view();
    fireEvent.click(screen.getByRole("button", { name: en.chart.showTable }));
    const table = screen.getByRole("table", { name: en.table.caption });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual([en.table.date, en.table.total, en.table.allowance, en.table.credits]);
    expect(within(table).getAllByRole("row")).toHaveLength(31);
    // Newest day first, with its three credit-paid actions.
    const first = within(table).getAllByRole("row")[1]!;
    expect(
      within(first)
        .getAllByRole("cell")
        .map((c) => c.textContent),
    ).toEqual([String(data.days.at(-1)!.actions), String(data.days.at(-1)!.fromAllowance), "3"]);
    expect(screen.queryByRole("img", { name: en.chart.title })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: en.chart.showChart }));
    expect(screen.getByRole("img", { name: en.chart.title })).toBeInTheDocument();
  });

  it("changes the period and asks for that many days", () => {
    hook.value = { isPending: false, isError: false, data: usage() };
    view();
    expect(hook.days.at(-1)).toBe(30);
    fireEvent.click(screen.getByRole("button", { name: en.period["90"] }));
    expect(hook.days.at(-1)).toBe(90);
    expect(screen.getByRole("button", { name: en.period["90"] })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("says so when there was no AI use, and on a load error offers a retry", () => {
    const empty = usage();
    empty.days = empty.days.map((d) => ({ ...d, actions: 0, fromAllowance: 0, fromCredits: 0 }));
    empty.totals = { actions: 0, fromAllowance: 0, fromCredits: 0 };
    hook.value = { isPending: false, isError: false, data: empty };
    view();
    expect(screen.getByText(en.empty)).toBeInTheDocument();
    cleanup();
    const refetch = vi.fn();
    hook.value = { isPending: false, isError: true, data: undefined, refetch };
    view();
    expect(screen.getByRole("alert")).toHaveTextContent(en.loadError);
    fireEvent.click(screen.getByRole("button", { name: en.retry }));
    expect(refetch).toHaveBeenCalled();
  });

  it("renders in Arabic with Arabic labels and a left-to-right chart", () => {
    hook.value = { isPending: false, isError: false, data: usage() };
    const { container } = view("ar");
    expect(screen.getByRole("heading", { name: ar.title })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: ar.chart.title })).toBeInTheDocument();
    expect(container.querySelector("figure")).toHaveAttribute("dir", "ltr");
    fireEvent.click(screen.getByRole("button", { name: ar.chart.showTable }));
    expect(screen.getByRole("table", { name: ar.table.caption })).toBeInTheDocument();
  });
});

describe("chart axis", () => {
  it("rounds the top up to a readable number", () => {
    expect([0, 3, 7, 13, 130, 1234].map(niceMax)).toEqual([4, 4, 10, 20, 200, 2000]);
  });
});

describe("aiUsage messages", () => {
  const flat = (o: object, p = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) =>
      typeof v === "object"
        ? flat(v as object, `${p}${k}.`)
        : [[`${p}${k}`, String(v)] as [string, string]],
    );
  it("has the same keys in English and Arabic, none empty, and no dashes", () => {
    expect(
      flat(ar)
        .map(([k]) => k)
        .sort(),
    ).toEqual(
      flat(en)
        .map(([k]) => k)
        .sort(),
    );
    for (const [, v] of [...flat(en), ...flat(ar)]) {
      expect(v.trim()).not.toBe("");
      expect(v).not.toMatch(/[–—]/);
    }
  });
});
