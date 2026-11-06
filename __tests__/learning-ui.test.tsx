import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LearningSummary } from "@/components/manar/features/learning-summary";
import { StartModeSwitcher } from "@/components/manar/features/start-mode-switcher";
import { BffError } from "@/lib/api/raw";
import featuresAr from "@/messages/ar/features.json";
import featuresEn from "@/messages/en/features.json";

const state = vi.hoisted(() => ({
  summary: { data: undefined as unknown, error: null as unknown, isError: false, isLoading: false },
  startMode: {
    data: undefined as unknown,
    error: null as unknown,
    isError: false,
    isLoading: false,
  },
  accept: vi.fn(),
  dismiss: vi.fn(),
  device: vi.fn(),
  setLearning: vi.fn(),
  setMode: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    message: vi.fn(),
    error: (m: string) => state.toast(m),
  }),
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
      lastsDays: 365,
    },
  ],
};

function ui(node: React.ReactNode, locale = "en") {
  return render(
    <NextIntlClientProvider
      locale={locale}
      timeZone="UTC"
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
  state.summary = { data: summary, error: null, isError: false, isLoading: false };
  state.startMode = {
    data: { mode: "ask", learning: { enabled: true, days: 7, source: "default" } },
    error: null,
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
  it("names the device and says how long it lasts and that it can be withdrawn, before the click", () => {
    ui(<LearningSummary />);
    const row = screen.getByText(/seen 9 times/).closest("li")!;
    expect(within(row).getByText("sara-laptop")).toBeInTheDocument();
    const accept = screen.getByRole("button", { name: "Always allow this here" });
    expect(accept).toHaveAccessibleDescription(
      /allowed on this device until \w{3} \d{1,2}, \d{4}\. You can withdraw it under Rules/,
    );
  });
  it("says plainly what learning does", () => {
    ui(<LearningSummary />);
    expect(
      screen.getByText(
        "While learning, Manar allows these actions and records them, so you can turn them into rules later. Secrets, deletes and other high-risk actions still ask.",
      ),
    ).toBeInTheDocument();
  });
  it("an approver sees what was learned but no buttons that would 403", () => {
    ui(<LearningSummary canChange={false} />);
    expect(screen.getByText(/seen 9 times/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Always allow this here" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Not now" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Stop learning" })).toBeNull();
    expect(
      screen.getByText("Only the workspace owner or a security admin can change this."),
    ).toBeInTheDocument();
  });
  it("only 403 and 404 stay silent; other failures say so", () => {
    for (const status of [403, 404]) {
      cleanup();
      state.summary = {
        data: undefined,
        error: new BffError(status, "x"),
        isError: true,
        isLoading: false,
      };
      expect(ui(<LearningSummary />).container).toBeEmptyDOMElement();
    }
    cleanup();
    state.summary = {
      data: undefined,
      error: new BffError(500, "x"),
      isError: true,
      isLoading: false,
    };
    ui(<LearningSummary />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load this");
  });
  it("shows nothing when there is nothing and learning is off", () => {
    state.summary = {
      data: {
        ...summary,
        learning: { ...summary.learning, enabled: false },
        totalWouldHaveAsked: 0,
        devices: [],
        suggestions: [],
      },
      error: null,
      isError: false,
      isLoading: false,
    };
    expect(ui(<LearningSummary />).container).toBeEmptyDOMElement();
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
    state.startMode = { data: { mode: "ask" }, error: null, isError: false, isLoading: false };
    ui(<StartModeSwitcher />);
    expect(screen.queryByRole("switch")).toBeNull();
  });
  it("a role that may not change it is told who can, not 'could not load'", () => {
    state.startMode = {
      data: undefined,
      error: new BffError(403, "x"),
      isError: true,
      isLoading: false,
    };
    ui(<StartModeSwitcher />);
    expect(screen.getByRole("note")).toHaveTextContent(
      "Only the workspace owner or a security admin",
    );
    expect(screen.queryByRole("switch")).toBeNull();
  });
  it("a 403 on save says who can change it", () => {
    state.setLearning.mockImplementation((_v: string, o: { onError: (e: unknown) => void }) =>
      o.onError(new BffError(403, "x")),
    );
    ui(<StartModeSwitcher />);
    fireEvent.click(screen.getByRole("switch", { name: "New devices learn first" }));
    expect(state.toast).toHaveBeenCalledWith(expect.stringContaining("Only the workspace owner"));
  });
  it("a Government refusal is translated from its code, not shown in the server's English", () => {
    const refusal = () =>
      state.setLearning.mockImplementation((_v: string, o: { onError: (e: unknown) => void }) =>
        o.onError(
          new BffError(403, "x", {
            reason: "learning_not_available_government",
            message:
              "Learning mode is not available in a Government workspace. Nothing was changed.",
          }),
        ),
      );
    refusal();
    ui(<StartModeSwitcher />);
    fireEvent.click(screen.getByRole("switch", { name: "New devices learn first" }));
    expect(state.toast).toHaveBeenCalledWith(featuresEn.learningGovernment);
    expect(featuresAr.learningGovernment).not.toBe(featuresEn.learningGovernment);
    // Another 403 stays the role sentence, even if the server wrote its own English.
    state.toast.mockClear();
    state.setLearning.mockImplementation((_v: string, o: { onError: (e: unknown) => void }) =>
      o.onError(new BffError(403, "x", { message: "Some English sentence" })),
    );
    fireEvent.click(screen.getByRole("switch", { name: "New devices learn first" }));
    expect(state.toast).toHaveBeenCalledWith(featuresEn.roleOnly);
  });
});
