import type { ReactElement } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { IncidentSummarizePanel } from "@/components/manar/incidents/incident-summarize-panel";
import { SuggestPolicyDialog } from "@/components/manar/policies/suggest-policy-dialog";
import { AuditInvestigatePanel } from "@/components/manar/audit/audit-investigate-panel";
import incidentsEn from "@/messages/en/incidents.json";
import incidentsAr from "@/messages/ar/incidents.json";
import policiesEn from "@/messages/en/policies.json";
import auditEn from "@/messages/en/audit.json";
import commonEn from "@/messages/en/common.json";

/**
 * Task 6, item 4: focused coverage for what Task 3 (task-3-brief.md) added
 * to the three long-form AI panels — an in-progress affordance (spinner +
 * `useElapsedSeconds`-driven ticking copy) gated on the mutation's
 * `isPending` state. `__tests__/longform-mutation-retry.test.tsx` already
 * proves the underlying hooks call their API exactly once on failure; this
 * file proves the *panels* actually render and update the affordance
 * itself, following that file's `apiClient` mocking convention and
 * `__tests__/rtl.test.tsx`'s `NextIntlClientProvider` rendering convention.
 * Deliberately scoped to only these three components — no broader coverage
 * added, per the plan's "deliberately thin test suite" instruction.
 */
vi.mock("@/lib/api/client", () => ({
  apiClient: { POST: vi.fn() },
}));

// The three panels now stream (or follow a background job) over fetch. A request that never
// answers is enough to observe the in-progress window these tests are about.
const pendingFetch = vi.hoisted(() => vi.fn());

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { apiClient } from "@/lib/api/client";

const mockedPost = vi.mocked(apiClient.POST);

function renderWithProviders(
  ui: ReactElement,
  messages: Record<string, unknown>,
  locale: "en" | "ar" = "en",
) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  mockedPost.mockReset();
  pendingFetch.mockReset();
  // Never answers: enough to observe the pending window; nothing here needs it to settle.
  pendingFetch.mockReturnValue(new Promise(() => {}));
  vi.stubGlobal("fetch", pendingFetch);
  // `shouldAdvanceTime` lets the fake clock also progress with real wall
  // time, so `@testing-library`'s `waitFor` polling (and TanStack Query's
  // microtask-scheduled state notifications) still work normally — while
  // `vi.advanceTimersByTime` below still lets each test jump the elapsed-
  // seconds ticks forward deterministically without waiting in real time.
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("IncidentSummarizePanel in-progress affordance", () => {
  it("shows a ticking elapsed-seconds hint while the summarize mutation is pending", async () => {
    renderWithProviders(<IncidentSummarizePanel incidentId="incident-1" />, {
      incidents: incidentsEn,
    });

    fireEvent.click(screen.getByRole("button", { name: "Summarize with AI" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Summarizing…" })).toBeInTheDocument(),
    );
    expect(screen.getByText("This can take a while (0s elapsed).")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText("This can take a while (3s elapsed).")).toBeInTheDocument();
  });

  it("renders the real Arabic in-progress copy (not English) for the Arabic locale", async () => {
    renderWithProviders(
      <IncidentSummarizePanel incidentId="incident-1" />,
      { incidents: incidentsAr },
      "ar",
    );

    fireEvent.click(screen.getByRole("button", { name: incidentsAr.summarize.summarize }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: incidentsAr.summarize.summarizing }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("قد يستغرق هذا بعض الوقت (0 ثانية منقضية).")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText("قد يستغرق هذا بعض الوقت (2 ثانية منقضية).")).toBeInTheDocument();
  });
});

describe("AuditInvestigatePanel in-progress affordance", () => {
  it("shows a ticking elapsed-seconds hint while the investigate mutation is pending", async () => {
    renderWithProviders(<AuditInvestigatePanel filters={{}} />, { audit: auditEn });

    fireEvent.change(screen.getByPlaceholderText(auditEn.investigate.placeholder), {
      target: { value: "Why was this action denied?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Asking…" })).toBeInTheDocument(),
    );
    expect(screen.getByText("This can take a while (0s elapsed).")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText("This can take a while (5s elapsed).")).toBeInTheDocument();
  });
});

describe("SuggestPolicyDialog in-progress affordance", () => {
  it("shows a ticking elapsed-seconds hint while the suggest mutation is pending", async () => {
    renderWithProviders(<SuggestPolicyDialog policies={[]} />, {
      policies: policiesEn,
      common: commonEn,
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Suggest with AI" }));
    });

    fireEvent.change(screen.getByLabelText(policiesEn.suggest.descriptionLabel), {
      target: { value: "SOC agents may query SIEM events only." },
    });
    fireEvent.change(screen.getByLabelText(policiesEn.suggest.newPolicyNameLabel), {
      target: { value: "AI-suggested access policy" },
    });

    // Starting the job answers at once; following it (the event stream) never ends here.
    pendingFetch.mockImplementation((url: string) =>
      url.endsWith("/events")
        ? new Promise(() => {})
        : Promise.resolve(
            Response.json(
              {
                job: {
                  id: "11111111-2222-4333-8444-555555555555",
                  kind: "policy_suggest",
                  status: "queued",
                  phase: "queued",
                  outputTokens: 0,
                  createdAt: "",
                  updatedAt: "",
                  result: null,
                  error: null,
                },
              },
              { status: 202 },
            ),
          ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Generate draft policy" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Generating…" })).toBeInTheDocument(),
    );
    expect(screen.getByText("This can take a while (0s elapsed).")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText("This can take a while (2s elapsed).")).toBeInTheDocument();
    // It runs in the background: the person is told they can leave, and can stop it.
    expect(screen.getByText(policiesEn.suggest.backgroundNote)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: policiesEn.suggest.stop })).toBeInTheDocument();
  });
});
