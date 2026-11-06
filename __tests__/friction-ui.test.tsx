import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FrictionCard } from "@/components/manar/friction/friction-card";
import { FrictionView } from "@/components/manar/friction/friction-view";
import type { FrictionReport } from "@/hooks/use-friction";
import { BffError } from "@/lib/api/raw";
import featuresAr from "@/messages/ar/features.json";
import featuresEn from "@/messages/en/features.json";
import commonEn from "@/messages/en/common.json";

const state = vi.hoisted(() => ({
  q: { data: undefined, error: null, isError: false, isLoading: false } as {
    data: unknown;
    error: unknown;
    isError: boolean;
    isLoading: boolean;
  },
  days: [] as number[],
}));
vi.mock("@/hooks/use-friction", () => ({
  useFriction: (d: number) => {
    state.days.push(d);
    return state.q;
  },
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={String(href)}>{children}</a>
  ),
}));

const nums = {
  prompts: 0,
  approvals: 0,
  denies: 0,
  expired: 0,
  deniedLaterApproved: 0,
  answered: 0,
  avgAnswerSeconds: 0,
  blockedMinutes: 0,
};
function report(over: Partial<FrictionReport> = {}): FrictionReport {
  return {
    scope: "workspace",
    days: 14,
    budget: 5,
    developers: 2,
    avgPromptsPerDeveloperPerDay: 2.5,
    overBudget: false,
    totals: {
      ...nums,
      prompts: 70,
      expired: 2,
      approvals: 60,
      denies: 10,
      deniedLaterApproved: 2,
      avgAnswerSeconds: 8.2,
      blockedMinutes: 9.5,
    },
    series: [
      { ...nums, day: "2026-11-04", prompts: 4, approvals: 3, denies: 1 },
      { ...nums, day: "2026-11-05", prompts: 6, approvals: 6 },
    ],
    people: [
      { ...nums, name: "Sara", me: true, prompts: 50 },
      { ...nums, name: null, me: false, prompts: 20 },
    ],
    ...over,
  };
}

function ui(node: React.ReactNode, locale = "en") {
  return render(
    <NextIntlClientProvider
      locale={locale}
      timeZone="UTC"
      messages={{ features: locale === "ar" ? featuresAr : featuresEn, common: commonEn }}
    >
      {node}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  state.days = [];
  state.q = { data: report(), error: null, isError: false, isLoading: false };
});
afterEach(cleanup);

describe("How much Manar asked you (decision 38)", () => {
  it("the card shows today, the average against the aim, and links to the trend", () => {
    ui(<FrictionCard />);
    expect(
      screen.getByRole("heading", { name: "How much Manar asked your team" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Asked 6 times today/)).toBeInTheDocument();
    expect(screen.getByText(/2\.5 a day on average \(aim: 5 or fewer\)/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See the trend" })).toHaveAttribute(
      "href",
      "/friction",
    );
  });
  it("the card is silent when unreadable or when Manar never asked", () => {
    state.q = { data: undefined, error: new Error("x"), isError: true, isLoading: false };
    expect(ui(<FrictionCard />).container).toBeEmptyDOMElement();
    cleanup();
    state.q = {
      data: report({ totals: { ...nums } }),
      error: null,
      isError: false,
      isLoading: false,
    };
    expect(ui(<FrictionCard />).container).toBeEmptyDOMElement();
  });
  it("the page has a chart with a text alternative and the same numbers as a table", () => {
    ui(<FrictionView />);
    const chart = screen.getByRole("img");
    expect(chart).toHaveAccessibleName(/70 in total, 2\.5 per developer per day/);
    const table = screen.getAllByRole("table")[0]!;
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByRole("columnheader", { name: "Minutes waited" })).toBeInTheDocument();
    expect(screen.getByText("Devices without an owner")).toBeInTheDocument();
    expect(screen.getByText("(you)")).toBeInTheDocument();
  });
  it("over the aim is said in words, not colour alone", () => {
    state.q = {
      data: report({ avgPromptsPerDeveloperPerDay: 7, overBudget: true }),
      error: null,
      isError: false,
      isLoading: false,
    };
    ui(<FrictionView />);
    expect(screen.getByText("That is above the aim.")).toBeInTheDocument();
  });
  it("changing the range asks for that many days; a person who is not an approver sees no people table", () => {
    state.q = {
      data: report({ scope: "me", people: undefined }),
      error: null,
      isError: false,
      isLoading: false,
    };
    ui(<FrictionView />);
    fireEvent.click(screen.getByRole("button", { name: "Last 30 days" }));
    expect(state.days.at(-1)).toBe(30);
    expect(screen.queryByText("By person")).toBeNull();
  });
  it("reads in Arabic", () => {
    ui(<FrictionView />, "ar");
    expect(screen.getByRole("heading", { name: "كم مرة سألك مانار" })).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(/70/);
  });
  it("the card says 'above the aim' in words, and which day it counts", () => {
    state.q = {
      data: report({ avgPromptsPerDeveloperPerDay: 7, overBudget: true }),
      error: null,
      isError: false,
      isLoading: false,
    };
    ui(<FrictionCard />);
    expect(
      screen.getByText(/7 a day on average \(aim: 5 or fewer\)\. That is above the aim\./),
    ).toBeInTheDocument();
    expect(screen.getByText(/times today \(UTC\)/)).toBeInTheDocument();
  });
  it("the card does not claim an overshoot when within the aim", () => {
    ui(<FrictionCard />);
    expect(screen.queryByText(/above the aim/)).toBeNull();
  });
  it("shows expired in the totals and the table, with the table in the chart's order", () => {
    ui(<FrictionView />);
    expect(screen.getByText(/2 not answered in time/)).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader", { name: "Not answered" }).length).toBeGreaterThan(0);
    const rows = within(screen.getAllByRole("table")[0]!).getAllByRole("row").slice(1);
    const days = rows.map((r) => within(r).getByRole("time").getAttribute("datetime"));
    expect(days).toEqual([...days].sort());
    expect(screen.getByRole("columnheader", { name: "Day (UTC)" })).toBeInTheDocument();
  });
  it("the chart is mirrored for right-to-left reading", () => {
    ui(<FrictionView />, "ar");
    expect(screen.getByRole("img").getAttribute("class")).toContain("rtl:-scale-x-100");
  });
  it("an older API gets a calm 'not available yet'; other failures are an alert", () => {
    state.q = { data: undefined, error: new BffError(404, "x"), isError: true, isLoading: false };
    ui(<FrictionView />);
    expect(screen.getByRole("note")).toHaveTextContent("Not available yet");
    expect(screen.queryByRole("alert")).toBeNull();
    cleanup();
    state.q = { data: undefined, error: new BffError(500, "x"), isError: true, isLoading: false };
    ui(<FrictionView />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load this");
  });
  it("an unexpected payload is silence on Home and 'not available yet' on the page, never a crash", () => {
    state.q = {
      data: { items: [], nextCursor: null },
      error: null,
      isError: false,
      isSuccess: true,
      isLoading: false,
    } as never;
    expect(ui(<FrictionCard />).container).toBeEmptyDOMElement();
    cleanup();
    ui(<FrictionView />);
    expect(screen.getByRole("note")).toHaveTextContent("Not available yet");
  });
});
