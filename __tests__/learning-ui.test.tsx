import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LearningSummary } from "@/components/manar/features/learning-summary";
import { StartModeSwitcher } from "@/components/manar/features/start-mode-switcher";
import featuresAr from "@/messages/ar/features.json";
import featuresEn from "@/messages/en/features.json";

const state = vi.hoisted(() => ({
  summary: { data: undefined as unknown, isError: false, isLoading: false },
  startMode: { data: undefined as unknown, isError: false, isLoading: false },
  accept: vi.fn(),
  dismiss: vi.fn(),
  device: vi.fn(),
  setLearning: vi.fn(),
  setMode: vi.fn(),
}));
vi.mock("@/hooks/use-learning", () => ({
  useLearningSummary: () => state.summary,
  useAcceptSuggestion: () => ({ isPending: false, mutate: state.accept }),
  useDismissSuggestion: () => ({ isPending: false, mutate: state.dismiss }),
  useSetDeviceLearning: () => ({ isPending: false, mutate: state.device }),
}));
vi.mock("@/hooks/use-features", () => ({
  useStartMode: () => state.startMode,
  useSetStartMode: () => ({ isPending: false, mutate: state.setMode }),
  useSetLearning: () => ({ isPending: false, mutate: state.setLearning }),
}));

const summary = {
  learning: { enabled: true, days: 7, source: "default" },
  totalWouldHaveAsked: 12,
  devices: [
    {
      hostId: "h1",
      hostname: "sara-laptop",
      learning: { active: true, endsAt: "2026-11-10T10:00:00Z", off: false },
      wouldHaveAsked: 12,
    },
  ],
  suggestions: [
    {
      id: "s1",
      hostId: "h1",
      hostname: "sara-laptop",
      toolId: "host.cursor",
      actionId: "edit",
      scope: "/home/sara/proj/src/*",
      count: 9,
      lastSeenAt: "2026-11-05T10:00:00Z",
    },
  ],
};

function ui(node: React.ReactNode, locale = "en") {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={{ features: locale === "ar" ? featuresAr : featuresEn }}
    >
      {node}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  Object.values(state).forEach(
    (v) => typeof v === "function" && (v as ReturnType<typeof vi.fn>).mockReset(),
  );
  state.summary = { data: summary, isError: false, isLoading: false };
  state.startMode = {
    data: { mode: "ask", learning: { enabled: true, days: 7, source: "default" } },
    isError: false,
    isLoading: false,
  };
});
afterEach(cleanup);

describe("what Manar saw this week (decision 36)", () => {
  it("lists what would have asked and accepts a suggestion with one tap", () => {
    ui(<LearningSummary />);
    expect(
      screen.getByRole("heading", { name: "Here is what Manar saw this week" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/12 actions would have asked you/)).toBeInTheDocument();
    expect(screen.getByText("/home/sara/proj/src/*")).toBeInTheDocument();
    expect(screen.getByText(/Learning until/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Always allow this here" }));
    expect(state.accept.mock.calls[0]![0]).toBe("s1");
  });
  it("Not now hides it, and Stop learning turns the device off", () => {
    ui(<LearningSummary />);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(state.dismiss.mock.calls[0]![0]).toBe("s1");
    fireEvent.click(screen.getByRole("button", { name: "Stop learning" }));
    expect(state.device.mock.calls[0]![0]).toEqual({ hostId: "h1", action: "off" });
  });
  it("shows nothing to a role without access, or when there is nothing and learning is off", () => {
    state.summary = { data: undefined, isError: true, isLoading: false };
    const a = ui(<LearningSummary />);
    expect(a.container).toBeEmptyDOMElement();
    cleanup();
    state.summary = {
      data: {
        ...summary,
        learning: { ...summary.learning, enabled: false },
        totalWouldHaveAsked: 0,
        devices: [],
        suggestions: [],
      },
      isError: false,
      isLoading: false,
    };
    const b = ui(<LearningSummary />);
    expect(b.container).toBeEmptyDOMElement();
  });
  it("reads in Arabic", () => {
    ui(<LearningSummary />, "ar");
    expect(
      screen.getByRole("heading", { name: "هذا ما رآه مانار هذا الأسبوع" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "اسمح دائماً هنا" })).toBeInTheDocument();
  });
});

describe("one start-mode setting with learning inside it", () => {
  it("the switch reflects the setting and turns learning off", () => {
    ui(<StartModeSwitcher />);
    const sw = screen.getByRole("switch", { name: "New devices learn first" });
    expect(sw).toHaveAttribute("aria-checked", "true");
    fireEvent.click(sw);
    expect(state.setLearning.mock.calls[0]![0]).toBe("off");
  });
  it("no switch when the API does not send the setting", () => {
    state.startMode = { data: { mode: "ask" }, isError: false, isLoading: false };
    ui(<StartModeSwitcher />);
    expect(screen.queryByRole("switch")).toBeNull();
  });
});
