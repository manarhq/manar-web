import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FrictionCard } from "@/components/manar/friction/friction-card";
import { FrictionView } from "@/components/manar/friction/friction-view";
import type { FrictionReport } from "@/hooks/use-friction";
import featuresAr from "@/messages/ar/features.json";
import featuresEn from "@/messages/en/features.json";
import commonEn from "@/messages/en/common.json";

const state = vi.hoisted(() => ({
  q: { data: undefined, isError: false, isLoading: false } as {
    data: unknown;
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
      messages={{ features: locale === "ar" ? featuresAr : featuresEn, common: commonEn }}
    >
      {node}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  state.days = [];
  state.q = { data: report(), isError: false, isLoading: false };
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
    state.q = { data: undefined, isError: true, isLoading: false };
    expect(ui(<FrictionCard />).container).toBeEmptyDOMElement();
    cleanup();
    state.q = { data: report({ totals: { ...nums } }), isError: false, isLoading: false };
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
      isError: false,
      isLoading: false,
    };
    ui(<FrictionView />);
    expect(screen.getByText("That is above the aim.")).toBeInTheDocument();
  });
  it("changing the range asks for that many days; a person who is not an approver sees no people table", () => {
    state.q = {
      data: report({ scope: "me", people: undefined }),
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
});
