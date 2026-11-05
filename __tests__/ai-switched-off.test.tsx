import type { ReactElement } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IncidentSummarizePanel } from "@/components/manar/incidents/incident-summarize-panel";
import { SuggestPolicyDialog } from "@/components/manar/policies/suggest-policy-dialog";
import { AuditInvestigatePanel } from "@/components/manar/audit/audit-investigate-panel";
import incidentsEn from "@/messages/en/incidents.json";
import incidentsAr from "@/messages/ar/incidents.json";
import policiesEn from "@/messages/en/policies.json";
import policiesAr from "@/messages/ar/policies.json";
import auditEn from "@/messages/en/audit.json";
import auditAr from "@/messages/ar/audit.json";
import commonEn from "@/messages/en/common.json";

/**
 * "Allow external AI" off: manar-api answers `available: false, reason: "ai_switched_off"`
 * and every AI panel shows the calm notice (EN and AR), never the "advisory service was
 * unreachable" text and never an error banner.
 */
vi.mock("@/lib/api/client", () => ({ apiClient: { POST: vi.fn() } }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { apiClient } from "@/lib/api/client";

const mockedPost = vi.mocked(apiClient.POST);
const OFF = { available: false, reason: "ai_switched_off", result: null, contextEventCount: 0 };

function renderWith(
  ui: ReactElement,
  messages: Record<string, unknown>,
  locale: "en" | "ar" = "en",
) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  mockedPost.mockReset();
  mockedPost.mockResolvedValue({ data: OFF, response: new Response() } as never);
});
afterEach(cleanup);

describe("AI features switched off for the workspace", () => {
  it.each([
    ["en", incidentsEn, "Summarize with AI"],
    ["ar", incidentsAr, incidentsAr.summarize.summarize],
  ] as const)("incident summary (%s)", async (locale, incidents, button) => {
    renderWith(<IncidentSummarizePanel incidentId="i-1" />, { incidents }, locale);
    fireEvent.click(screen.getByRole("button", { name: button }));
    expect(await screen.findByText(incidents.summarize.aiOff)).toBeInTheDocument();
    expect(screen.queryByText(incidents.summarize.unavailable)).toBeNull();
  });

  it.each([
    ["en", auditEn, "Ask"],
    ["ar", auditAr, auditAr.investigate.ask],
  ] as const)("audit investigate (%s)", async (locale, audit, button) => {
    renderWith(<AuditInvestigatePanel filters={{}} />, { audit }, locale);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "why was it denied?" } });
    fireEvent.click(screen.getByRole("button", { name: button }));
    expect(await screen.findByText(audit.investigate.aiOff)).toBeInTheDocument();
    expect(screen.queryByText(audit.investigate.unavailable)).toBeNull();
  });

  it.each([
    ["en", policiesEn],
    ["ar", policiesAr],
  ] as const)("suggest policy (%s)", async (locale, policies) => {
    mockedPost.mockResolvedValue({
      data: { ...OFF, policyId: null, version: null, explanation: null, confidence: null },
      response: new Response(),
    } as never);
    renderWith(<SuggestPolicyDialog policies={[]} />, { policies, common: commonEn }, locale);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: policies.suggest.trigger }));
    });
    fireEvent.change(screen.getByLabelText(policies.suggest.descriptionLabel), {
      target: { value: "SOC agents may query SIEM events only." },
    });
    fireEvent.change(screen.getByLabelText(policies.suggest.newPolicyNameLabel), {
      target: { value: "AI-suggested access policy" },
    });
    fireEvent.click(screen.getByRole("button", { name: policies.suggest.generateButton }));
    await waitFor(() => expect(screen.getByText(policies.suggest.aiOff)).toBeInTheDocument());
    expect(screen.queryByText(policies.suggest.unavailableTitle)).toBeNull();
  });
});
