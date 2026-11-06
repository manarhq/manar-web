import type { ReactElement } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuditInvestigatePanel } from "@/components/manar/audit/audit-investigate-panel";
import { IncidentSummarizePanel } from "@/components/manar/incidents/incident-summarize-panel";
import { SuggestPolicyDialog } from "@/components/manar/policies/suggest-policy-dialog";
import { PolicyJobNotifier } from "@/components/manar/policies/policy-job-notifier";
import { trackPolicyJob } from "@/lib/ai-stream/job-tracker";
import auditEn from "@/messages/en/audit.json";
import incidentsEn from "@/messages/en/incidents.json";
import policiesEn from "@/messages/en/policies.json";
import policiesAr from "@/messages/ar/policies.json";
import commonEn from "@/messages/en/common.json";

const push = vi.hoisted(() => vi.fn());
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push }),
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  message: vi.fn(),
}));
vi.mock("sonner", () => ({ toast }));

const fetchMock = vi.fn();
const enc = new TextEncoder();
const JOB = "11111111-2222-4333-8444-555555555555";
// The tracker is module state: the notifier test uses an id no earlier test followed.
const NOTIFIED_JOB = "99999999-2222-4333-8444-555555555555";

function render2(ui: ReactElement, messages: Record<string, unknown>, locale: "en" | "ar" = "en") {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

/** An event stream the test feeds by hand; aborting the request errors it like a real fetch. */
function manualStream() {
  let c!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      c = controller;
    },
  });
  fetchMock.mockImplementationOnce((_u: string, init?: RequestInit) => {
    init?.signal?.addEventListener("abort", () =>
      c.error(new DOMException("aborted", "AbortError")),
    );
    return Promise.resolve(
      new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } }),
    );
  });
  return {
    send: (event: string, data: unknown) =>
      c.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)),
    end: () => c.close(),
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  push.mockReset();
  Object.values(toast).forEach((f) => f.mockReset());
  vi.unstubAllGlobals();
});

describe("AuditInvestigatePanel streaming", () => {
  const result = {
    available: true,
    result: {
      answer: "Denied by rule 4.",
      citations: ["e1"],
      confidence: 0.7,
      explanation: "Grounded.",
    },
    contextEventCount: 3,
  };

  it("posts to the stream route, shows words as they arrive, then the final cited answer", async () => {
    render2(<AuditInvestigatePanel filters={{ decision: "DENY" } as never} />, { audit: auditEn });
    const stream = manualStream();
    fireEvent.change(screen.getByPlaceholderText(auditEn.investigate.placeholder), {
      target: { value: "Why denied?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/bff/audit/investigate/stream");
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      question: "Why denied?",
      decision: "DENY",
    });

    act(() => stream.send("delta", { t: "Denied by " }));
    expect(await screen.findByText("Denied by")).toHaveAttribute("aria-live", "off");
    expect(screen.getByText(auditEn.investigate.writing)).toBeInTheDocument();

    act(() => {
      stream.send("done", result);
      stream.end();
    });
    expect(await screen.findByText("Denied by rule 4.")).toBeInTheDocument();
    expect(screen.getByText("e1")).toBeInTheDocument();
    expect(screen.queryByText(auditEn.investigate.writing)).not.toBeInTheDocument();
  });

  it("stop closes the request and keeps the partial answer marked as incomplete", async () => {
    render2(<AuditInvestigatePanel filters={{}} />, { audit: auditEn });
    const stream = manualStream();
    fireEvent.change(screen.getByPlaceholderText(auditEn.investigate.placeholder), {
      target: { value: "Why?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    act(() => stream.send("delta", { t: "Half an" }));
    await screen.findByText("Half an");

    fireEvent.click(screen.getByRole("button", { name: auditEn.investigate.stop }));

    expect(await screen.findByText(auditEn.investigate.stopped)).toBeInTheDocument();
    expect(screen.getByText("Half an")).toBeInTheDocument();
    expect((fetchMock.mock.calls[0]![1] as RequestInit).signal?.aborted).toBe(true);
    expect(screen.getByRole("button", { name: "Ask" })).toBeEnabled();
  });

  it("shows manar-api's refusal (paused plan) as an error, not as an empty answer", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        { statusCode: 402, message: "Paused: add credits or raise your cap." },
        { status: 402 },
      ),
    );
    render2(<AuditInvestigatePanel filters={{}} />, { audit: auditEn });
    fireEvent.change(screen.getByPlaceholderText(auditEn.investigate.placeholder), {
      target: { value: "Why?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText(/Paused: add credits/)).toBeInTheDocument();
  });

  it("a stream that ends with no result is an error", async () => {
    render2(<AuditInvestigatePanel filters={{}} />, { audit: auditEn });
    const stream = manualStream();
    fireEvent.change(screen.getByPlaceholderText(auditEn.investigate.placeholder), {
      target: { value: "Why?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    act(() => stream.end());
    expect(await screen.findByText(auditEn.investigate.requestError)).toBeInTheDocument();
  });
});

describe("IncidentSummarizePanel streaming", () => {
  it("streams the summary then shows the full structured result", async () => {
    render2(<IncidentSummarizePanel incidentId="i1" />, { incidents: incidentsEn });
    const stream = manualStream();
    fireEvent.click(screen.getByRole("button", { name: "Summarize with AI" }));
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/bff/incidents/summarize/stream");
    act(() => stream.send("delta", { t: "Three denials" }));
    expect(await screen.findByText("Three denials")).toBeInTheDocument();
    act(() => {
      stream.send("done", {
        available: true,
        contextEventCount: 3,
        result: {
          summary: "Three denials in a row.",
          keyEvents: ["denied x3"],
          probableRootCause: "A retry loop.",
          recommendedNextSteps: ["Check the agent."],
          confidence: 0.8,
          explanation: "From three events.",
        },
      });
      stream.end();
    });
    expect(await screen.findByText("Three denials in a row.")).toBeInTheDocument();
    expect(screen.getByText("denied x3")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: incidentsEn.summarize.regenerate }),
    ).toBeInTheDocument();
  });
});

describe("Suggest policy as a background job", () => {
  const job = (over: object = {}) => ({
    id: JOB,
    kind: "policy_suggest",
    status: "queued",
    phase: "queued",
    outputTokens: 0,
    createdAt: "",
    updatedAt: "",
    result: null,
    error: null,
    ...over,
  });

  function fill() {
    fireEvent.click(screen.getByRole("button", { name: "Suggest with AI" }));
    fireEvent.change(screen.getByLabelText(policiesEn.suggest.descriptionLabel), {
      target: { value: "SOC agents may query SIEM events only." },
    });
    fireEvent.change(screen.getByLabelText(policiesEn.suggest.newPolicyNameLabel), {
      target: { value: "SOC reads" },
    });
  }

  it("starts a job (not the 100-second request), shows progress, and opens the draft when it is ready", async () => {
    render2(<SuggestPolicyDialog policies={[]} />, { policies: policiesEn, common: commonEn });
    fetchMock.mockResolvedValueOnce(Response.json({ job: job() }, { status: 202 }));
    const events = manualStream();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Generate draft policy" }));

    await waitFor(() => expect(fetchMock.mock.calls[0]![0]).toBe("/api/bff/policies/suggest/jobs"));
    expect(JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string)).toMatchObject({
      naturalLanguageDescription: "SOC agents may query SIEM events only.",
      policyName: "SOC reads",
    });
    await waitFor(() =>
      expect(fetchMock.mock.calls[1]![0]).toBe(`/api/bff/policies/suggest/jobs/${JOB}/events`),
    );

    act(() =>
      events.send("progress", job({ status: "running", phase: "drafting", outputTokens: 480 })),
    );
    expect(await screen.findByText(/Drafting the rules/)).toBeInTheDocument();
    expect(screen.getByText(/About 480 tokens written so far/)).toBeInTheDocument();

    act(() => {
      events.send(
        "done",
        job({
          status: "ready",
          phase: "done",
          result: {
            available: true,
            policyId: "p1",
            versionId: "v1",
            explanation: "why",
            confidence: 0.8,
            ruleCount: 3,
          },
        }),
      );
      events.end();
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/policies/p1?version=v1"));
  });

  it("says plainly that nothing was created when the advisor produced no draft", async () => {
    render2(<SuggestPolicyDialog policies={[]} />, { policies: policiesEn, common: commonEn });
    fetchMock.mockResolvedValueOnce(Response.json({ job: job() }, { status: 202 }));
    const events = manualStream();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Generate draft policy" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    act(() => {
      events.send(
        "done",
        job({
          status: "ready",
          phase: "done",
          error: "model_unavailable",
          result: {
            available: false,
            policyId: null,
            versionId: null,
            explanation: "no",
            confidence: null,
            ruleCount: 0,
          },
        }),
      );
      events.end();
    });
    expect(await screen.findByText(policiesEn.suggest.unavailableTitle)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a refused start (402 paused plan) and starts no job", async () => {
    render2(<SuggestPolicyDialog policies={[]} />, { policies: policiesEn, common: commonEn });
    fetchMock.mockResolvedValueOnce(
      Response.json(
        { statusCode: 402, message: "Paused: add credits or raise your cap." },
        { status: 402 },
      ),
    );
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Generate draft policy" }));
    expect(await screen.findByText(/Paused: add credits/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stop asks the server to stop the job", async () => {
    render2(<SuggestPolicyDialog policies={[]} />, { policies: policiesEn, common: commonEn });
    fetchMock.mockResolvedValueOnce(Response.json({ job: job() }, { status: 202 }));
    manualStream();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Generate draft policy" }));
    const stop = await screen.findByRole("button", { name: policiesEn.suggest.stop });
    fetchMock.mockResolvedValueOnce(Response.json({ job: job() }));
    fireEvent.click(stop);
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([, i]) => (i as RequestInit | undefined)?.method === "DELETE",
      );
      expect(call?.[0]).toBe(`/api/bff/policies/suggest/jobs/${JOB}`);
    });
  });

  it("has Arabic strings for the whole job flow", () => {
    for (const key of [
      "backgroundNote",
      "phaseDrafting",
      "tokensSoFar",
      "stop",
      "readyToast",
      "openDraft",
    ] as const) {
      expect(policiesAr.suggest[key]).toBeTruthy();
      expect(policiesAr.suggest[key]).not.toBe(policiesEn.suggest[key]);
    }
  });
});

describe("PolicyJobNotifier (the ready notification)", () => {
  it("tells the person when a draft they closed the dialog on is ready, with a button to open it", async () => {
    const events = manualStream();
    render2(<PolicyJobNotifier />, { policies: policiesEn });
    act(() =>
      trackPolicyJob({
        id: NOTIFIED_JOB,
        kind: "policy_suggest",
        status: "running",
        phase: "drafting",
        outputTokens: 0,
        createdAt: "",
        updatedAt: "",
        result: null,
        error: null,
      }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    act(() => {
      events.send("done", {
        id: NOTIFIED_JOB,
        kind: "policy_suggest",
        status: "ready",
        phase: "done",
        outputTokens: 900,
        createdAt: "",
        updatedAt: "",
        error: null,
        result: {
          available: true,
          policyId: "p9",
          versionId: "v9",
          explanation: "x",
          confidence: 0.9,
          ruleCount: 2,
        },
      });
      events.end();
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    const [title, options] = toast.success.mock.calls[0] as [
      string,
      { description: string; action: { label: string; onClick: () => void } },
    ];
    expect(title).toBe(policiesEn.suggest.readyToast);
    expect(options.description).toContain("2 rules drafted");
    options.action.onClick();
    expect(push).toHaveBeenCalledWith("/policies/p9?version=v9");
    expect(localStorage.getItem("manar:ai-jobs")).toBe("[]");
  });
});
