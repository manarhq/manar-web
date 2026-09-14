import type { ReactElement } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";

import { CoverageBadge } from "@/components/manar/ai-systems/coverage-badge";
import { CoveragePanel } from "@/components/manar/ai-systems/coverage-panel";
import {
  COVERAGE_VALUES,
  coverageFacts,
  coveragePresentation,
  observationFiguresAreMeasurements,
} from "@/components/manar/ai-systems/coverage";
import {
  ALLOWED_TRANSITIONS,
  allowedTransitions,
  classifyTransitionFailure,
  isTerminal,
  requiresSecondReviewer,
} from "@/components/manar/ai-systems/lifecycle";
import { canManageAiSystems } from "@/components/manar/ai-systems/access";
import { isRtlLocale } from "@/i18n/routing";
import type { AiSystemCoverage, AiSystemCoverageValue } from "@/hooks/use-ai-systems";
import aiSystemsEn from "@/messages/en/aiSystems.json";
import aiSystemsAr from "@/messages/ar/aiSystems.json";

/**
 * Coverage is the one thing on this surface that is easy to render
 * dishonestly, so it gets the real test coverage: every one of the four
 * values, the rule that `MONITORING_UNAVAILABLE`'s observation figures
 * are not measurements, and — the case this file exists for — that
 * `MONITORING_UNAVAILABLE` is visually *and* textually distinct from
 * `DECLARED_ONLY` even when the two carry byte-identical payload numbers.
 */

afterEach(() => {
  cleanup();
});

function renderWithLocale(ui: ReactElement, locale: "en" | "ar") {
  const messages = { aiSystems: locale === "ar" ? aiSystemsAr : aiSystemsEn };
  return render(
    <div dir={isRtlLocale(locale) ? "rtl" : "ltr"} lang={locale}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        {ui}
      </NextIntlClientProvider>
    </div>,
  );
}

/** The exact payload shape manar-api returns when the observation source
 * could not be consulted: it deliberately zeroes `observedAgentCount` and
 * nulls `lastObservedAt` because neither is a measurement. */
const UNAVAILABLE: AiSystemCoverage = {
  coverage: "MONITORING_UNAVAILABLE",
  linkedAgentCount: 3,
  activeLinkedAgentCount: 2,
  observedAgentCount: 0,
  lastObservedAt: null,
  observationWindowDays: 30,
};

/** Byte-identical counts to `UNAVAILABLE`, but a genuine "we looked and
 * saw nothing" answer. The two must not render the same way. */
const DECLARED: AiSystemCoverage = { ...UNAVAILABLE, coverage: "DECLARED_ONLY" };

const GOVERNED: AiSystemCoverage = {
  coverage: "GOVERNED",
  linkedAgentCount: 3,
  activeLinkedAgentCount: 2,
  observedAgentCount: 2,
  lastObservedAt: "2026-09-01T10:30:00.000Z",
  observationWindowDays: 30,
};

const OBSERVED: AiSystemCoverage = {
  ...GOVERNED,
  coverage: "OBSERVED_ONLY",
  activeLinkedAgentCount: 0,
};

describe("coverage presentation is four answers, not a ramp", () => {
  it("covers exactly the four values the API can return", () => {
    expect([...COVERAGE_VALUES].sort()).toEqual(
      ["DECLARED_ONLY", "GOVERNED", "MONITORING_UNAVAILABLE", "OBSERVED_ONLY"].sort(),
    );
  });

  it("gives every value its own visual surface", () => {
    const surfaces = COVERAGE_VALUES.map((value) => coveragePresentation(value).surface);
    expect(new Set(surfaces).size).toBe(COVERAGE_VALUES.length);
  });

  it("never reuses the reserved risk ramp for coverage", () => {
    for (const value of COVERAGE_VALUES) {
      expect(coveragePresentation(value).className).not.toMatch(/risk-/);
    }
  });

  it("hatches MONITORING_UNAVAILABLE and nothing else", () => {
    for (const value of COVERAGE_VALUES) {
      expect(coveragePresentation(value).hatched).toBe(value === "MONITORING_UNAVAILABLE");
    }
  });

  it("dashes DECLARED_ONLY and nothing else", () => {
    for (const value of COVERAGE_VALUES) {
      expect(coveragePresentation(value).border).toBe(
        value === "DECLARED_ONLY" ? "dashed" : "solid",
      );
    }
  });
});

describe("observation figures are only measurements when they were measured", () => {
  it("treats every value except MONITORING_UNAVAILABLE as measured", () => {
    for (const value of COVERAGE_VALUES) {
      expect(observationFiguresAreMeasurements(value)).toBe(value !== "MONITORING_UNAVAILABLE");
    }
  });

  it("withholds the observation figures under MONITORING_UNAVAILABLE rather than reporting the API's zero", () => {
    const facts = coverageFacts(UNAVAILABLE);
    const observed = facts.find((fact) => fact.key === "observedAgents");
    const lastObserved = facts.find((fact) => fact.key === "lastObserved");
    expect(observed).toEqual({ key: "observedAgents", kind: "unavailable" });
    expect(lastObserved).toEqual({ key: "lastObserved", kind: "unavailable" });
    // The counts that come from agent status, not telemetry, stay real.
    expect(facts.find((fact) => fact.key === "linkedAgents")).toEqual({
      key: "linkedAgents",
      kind: "count",
      count: 3,
    });
    expect(facts.find((fact) => fact.key === "activeLinkedAgents")).toEqual({
      key: "activeLinkedAgents",
      kind: "count",
      count: 2,
    });
  });

  it("reports the same zero as a real measurement under DECLARED_ONLY", () => {
    const facts = coverageFacts(DECLARED);
    expect(facts.find((fact) => fact.key === "observedAgents")).toEqual({
      key: "observedAgents",
      kind: "count",
      count: 0,
    });
    expect(facts.find((fact) => fact.key === "lastObserved")).toEqual({
      key: "lastObserved",
      kind: "never",
    });
  });

  it("reports a real observation timestamp under GOVERNED", () => {
    expect(coverageFacts(GOVERNED).find((fact) => fact.key === "lastObserved")).toEqual({
      key: "lastObserved",
      kind: "timestamp",
      timestamp: "2026-09-01T10:30:00.000Z",
    });
  });

  it("always echoes the observation window back", () => {
    for (const coverage of [GOVERNED, OBSERVED, DECLARED, UNAVAILABLE]) {
      expect(coverageFacts(coverage).find((fact) => fact.key === "window")).toEqual({
        key: "window",
        kind: "count",
        count: 30,
      });
    }
  });
});

describe("CoverageBadge renders each of the four distinctly", () => {
  const labels: Record<AiSystemCoverageValue, string> = {
    GOVERNED: aiSystemsEn.coverage.GOVERNED.label,
    OBSERVED_ONLY: aiSystemsEn.coverage.OBSERVED_ONLY.label,
    DECLARED_ONLY: aiSystemsEn.coverage.DECLARED_ONLY.label,
    MONITORING_UNAVAILABLE: aiSystemsEn.coverage.MONITORING_UNAVAILABLE.label,
  };

  for (const value of COVERAGE_VALUES) {
    it(`renders ${value} with its own label and machine-readable surface`, () => {
      const { container } = renderWithLocale(<CoverageBadge coverage={value} />, "en");
      const badge = container.querySelector("[data-slot='coverage-badge']");
      expect(badge).not.toBeNull();
      expect(badge).toHaveAttribute("data-coverage", value);
      expect(badge).toHaveAttribute("data-coverage-surface", coveragePresentation(value).surface);
      expect(badge).toHaveTextContent(labels[value]);
    });
  }

  it("gives the four badges four different labels", () => {
    expect(new Set(Object.values(labels)).size).toBe(4);
  });

  it("only MONITORING_UNAVAILABLE carries the hatch texture", () => {
    for (const value of COVERAGE_VALUES) {
      const { container } = renderWithLocale(<CoverageBadge coverage={value} />, "en");
      const badge = container.querySelector("[data-slot='coverage-badge']") as HTMLElement;
      expect(badge.dataset.coverageHatched).toBe(
        value === "MONITORING_UNAVAILABLE" ? "true" : "false",
      );
      expect(badge.style.backgroundImage !== "").toBe(value === "MONITORING_UNAVAILABLE");
      cleanup();
    }
  });
});

describe("MONITORING_UNAVAILABLE is not DECLARED_ONLY", () => {
  it("renders a distinct label and meaning for identical payload numbers", () => {
    const { container: unavailable } = renderWithLocale(
      <CoveragePanel coverage={UNAVAILABLE} />,
      "en",
    );
    expect(
      within(unavailable).getByText(aiSystemsEn.coverage.MONITORING_UNAVAILABLE.label),
    ).toBeInTheDocument();
    expect(
      within(unavailable).getByText(aiSystemsEn.coverage.MONITORING_UNAVAILABLE.meaning),
    ).toBeInTheDocument();
    cleanup();

    const { container: declared } = renderWithLocale(<CoveragePanel coverage={DECLARED} />, "en");
    expect(
      within(declared).getByText(aiSystemsEn.coverage.DECLARED_ONLY.label),
    ).toBeInTheDocument();
    expect(
      within(declared).getByText(aiSystemsEn.coverage.DECLARED_ONLY.meaning),
    ).toBeInTheDocument();
  });

  it("raises a live alert for MONITORING_UNAVAILABLE only", () => {
    const { container: unavailable } = renderWithLocale(
      <CoveragePanel coverage={UNAVAILABLE} />,
      "en",
    );
    const alert = unavailable.querySelector("[data-slot='coverage-unavailable-alert']");
    expect(alert).not.toBeNull();
    expect(alert).toHaveAttribute("role", "status");
    expect(alert).toHaveTextContent(aiSystemsEn.coverage.unavailableAlertTitle);
    cleanup();

    const { container: declared } = renderWithLocale(<CoveragePanel coverage={DECLARED} />, "en");
    expect(declared.querySelector("[data-slot='coverage-unavailable-alert']")).toBeNull();
  });

  it("does not present the API's placeholder zero as an observation count", () => {
    const { container } = renderWithLocale(<CoveragePanel coverage={UNAVAILABLE} />, "en");
    const observed = container.querySelector("[data-coverage-fact='observedAgents']");
    const lastObserved = container.querySelector("[data-coverage-fact='lastObserved']");
    expect(observed).toHaveTextContent(aiSystemsEn.coverage.figureUnavailable);
    expect(observed?.textContent).not.toMatch(/\b0\b/);
    expect(lastObserved).toHaveTextContent(aiSystemsEn.coverage.figureUnavailable);
    // "Never observed" would be a claim about the system; this is a claim
    // about the platform.
    expect(lastObserved?.textContent).not.toContain(aiSystemsEn.coverage.neverObserved);
  });

  it("does present the same zero honestly under DECLARED_ONLY", () => {
    const { container } = renderWithLocale(<CoveragePanel coverage={DECLARED} />, "en");
    const observed = container.querySelector("[data-coverage-fact='observedAgents']");
    const lastObserved = container.querySelector("[data-coverage-fact='lastObserved']");
    expect(observed).toHaveTextContent("0");
    expect(observed?.textContent).not.toContain(aiSystemsEn.coverage.figureUnavailable);
    expect(lastObserved).toHaveTextContent(aiSystemsEn.coverage.neverObserved);
  });

  it("keeps the agent-status counts real under MONITORING_UNAVAILABLE", () => {
    const { container } = renderWithLocale(<CoveragePanel coverage={UNAVAILABLE} />, "en");
    expect(container.querySelector("[data-coverage-fact='linkedAgents']")).toHaveTextContent("3");
    expect(container.querySelector("[data-coverage-fact='activeLinkedAgents']")).toHaveTextContent(
      "2",
    );
  });

  it("marks the two panels apart at the DOM level, not just in prose", () => {
    const { container: unavailable } = renderWithLocale(
      <CoveragePanel coverage={UNAVAILABLE} />,
      "en",
    );
    const a = unavailable.querySelector("[data-slot='coverage-panel']");
    expect(a).toHaveAttribute("data-coverage-surface", "unknown");
    cleanup();
    const { container: declared } = renderWithLocale(<CoveragePanel coverage={DECLARED} />, "en");
    expect(declared.querySelector("[data-slot='coverage-panel']")).toHaveAttribute(
      "data-coverage-surface",
      "declared",
    );
  });
});

describe("GOVERNED and OBSERVED_ONLY", () => {
  it("renders GOVERNED with its observation timestamp", () => {
    const { container } = renderWithLocale(<CoveragePanel coverage={GOVERNED} />, "en");
    expect(container.querySelector("[data-slot='coverage-panel']")).toHaveAttribute(
      "data-coverage-surface",
      "verified",
    );
    expect(container.querySelector("[data-coverage-fact='lastObserved']")?.textContent).not.toBe(
      "",
    );
    expect(container.querySelector("[data-slot='coverage-unavailable-alert']")).toBeNull();
  });

  it("renders OBSERVED_ONLY as its own answer, with zero active linked agents", () => {
    const { container } = renderWithLocale(<CoveragePanel coverage={OBSERVED} />, "en");
    expect(container.querySelector("[data-slot='coverage-panel']")).toHaveAttribute(
      "data-coverage-surface",
      "observed",
    );
    expect(screen.getByText(aiSystemsEn.coverage.OBSERVED_ONLY.meaning)).toBeInTheDocument();
    expect(container.querySelector("[data-coverage-fact='activeLinkedAgents']")).toHaveTextContent(
      "0",
    );
  });
});

describe("coverage in Arabic (RTL)", () => {
  it("renders the real Arabic label for every value, never the English one", () => {
    for (const value of COVERAGE_VALUES) {
      const { container } = renderWithLocale(<CoverageBadge coverage={value} />, "ar");
      const badge = container.querySelector("[data-slot='coverage-badge']") as HTMLElement;
      expect(badge.textContent).toContain(aiSystemsAr.coverage[value].label);
      expect(badge.textContent).not.toContain(aiSystemsEn.coverage[value].label);
      expect(container.querySelector("[dir='rtl']")).not.toBeNull();
      cleanup();
    }
  });

  it("keeps the MONITORING_UNAVAILABLE alert distinct in Arabic too", () => {
    const { container } = renderWithLocale(<CoveragePanel coverage={UNAVAILABLE} />, "ar");
    const alert = container.querySelector("[data-slot='coverage-unavailable-alert']");
    expect(alert).toHaveTextContent(aiSystemsAr.coverage.unavailableAlertTitle);
    expect(container.querySelector("[data-coverage-fact='observedAgents']")).toHaveTextContent(
      aiSystemsAr.coverage.figureUnavailable,
    );
    cleanup();

    const { container: declared } = renderWithLocale(<CoveragePanel coverage={DECLARED} />, "ar");
    expect(declared.querySelector("[data-slot='coverage-unavailable-alert']")).toBeNull();
    expect(declared).toHaveTextContent(aiSystemsAr.coverage.DECLARED_ONLY.label);
  });

  it("resolves the Arabic plural form of the observation window", () => {
    const { container } = renderWithLocale(<CoveragePanel coverage={GOVERNED} />, "ar");
    const window = container.querySelector("[data-coverage-fact='window']");
    // 30 selects Arabic's `many` category — the rendered string must be a
    // resolved plural, never the raw ICU source.
    expect(window?.textContent).toContain("30");
    expect(window?.textContent).not.toContain("plural");
  });
});

describe("lifecycle edges mirror the server's allowed-transition table", () => {
  it("offers only legal targets from each state", () => {
    expect(allowedTransitions("DRAFT")).toEqual(["REVIEW", "RETIRED"]);
    expect(allowedTransitions("REVIEW")).toEqual(["ACTIVE", "DRAFT", "RETIRED"]);
    expect(allowedTransitions("ACTIVE")).toEqual(["SUSPENDED", "RETIRED"]);
    expect(allowedTransitions("SUSPENDED")).toEqual(["ACTIVE", "RETIRED"]);
    expect(allowedTransitions("RETIRED")).toEqual([]);
  });

  it("treats RETIRED, and only RETIRED, as terminal", () => {
    for (const state of Object.keys(ALLOWED_TRANSITIONS) as (keyof typeof ALLOWED_TRANSITIONS)[]) {
      expect(isTerminal(state)).toBe(state === "RETIRED");
    }
  });

  it("applies separation of duties to REVIEW -> ACTIVE alone", () => {
    expect(requiresSecondReviewer("REVIEW", "ACTIVE")).toBe(true);
    expect(requiresSecondReviewer("DRAFT", "REVIEW")).toBe(false);
    expect(requiresSecondReviewer("ACTIVE", "SUSPENDED")).toBe(false);
    expect(requiresSecondReviewer("SUSPENDED", "ACTIVE")).toBe(false);
  });
});

describe("a transition rejection is told apart, not flattened to 'forbidden'", () => {
  it("reads 409 as an illegal edge", () => {
    expect(
      classifyTransitionFailure({
        status: 409,
        from: "DRAFT",
        to: "ACTIVE",
        callerCanManage: true,
      }),
    ).toBe("notAllowedEdge");
  });

  it("reads a 403 on REVIEW -> ACTIVE by an authorized user as separation of duties", () => {
    expect(
      classifyTransitionFailure({
        status: 403,
        from: "REVIEW",
        to: "ACTIVE",
        callerCanManage: true,
      }),
    ).toBe("separationOfDuties");
  });

  it("reads a 403 on any other edge as an insufficient role", () => {
    expect(
      classifyTransitionFailure({
        status: 403,
        from: "ACTIVE",
        to: "SUSPENDED",
        callerCanManage: true,
      }),
    ).toBe("insufficientRole");
  });

  it("reads a 403 for a user without a write role as an insufficient role", () => {
    expect(
      classifyTransitionFailure({
        status: 403,
        from: "REVIEW",
        to: "ACTIVE",
        callerCanManage: false,
      }),
    ).toBe("insufficientRole");
  });

  it("honours the server's own separation-of-duties wording as an extra signal", () => {
    expect(
      classifyTransitionFailure({
        status: 403,
        message:
          "Transition to ACTIVE must be performed by a different user than the one who submitted this AI system for review",
        from: "REVIEW",
        to: "ACTIVE",
        callerCanManage: false,
      }),
    ).toBe("separationOfDuties");
  });

  it("gives the separation-of-duties case its own actionable copy in both locales", () => {
    const en = aiSystemsEn.transition.errors;
    const ar = aiSystemsAr.transition.errors;
    expect(en.separationOfDuties).not.toBe(en.insufficientRole);
    expect(ar.separationOfDuties).not.toBe(ar.insufficientRole);
    // The remedy — a different authorized reviewer — has to be stated,
    // not implied by the word "forbidden".
    expect(en.separationOfDuties).toMatch(/different authorized reviewer/i);
  });
});

describe("write affordances follow the API's role gate", () => {
  it("allows exactly the three roles manar-api gates writes to", () => {
    expect(canManageAiSystems(["AI_GOVERNANCE_MANAGER"])).toBe(true);
    expect(canManageAiSystems(["SECURITY_ADMIN"])).toBe(true);
    expect(canManageAiSystems(["TENANT_OWNER"])).toBe(true);
    expect(canManageAiSystems(["AUDITOR", "APPROVER", "SOC_OPERATOR", "READ_ONLY"])).toBe(false);
    expect(canManageAiSystems([])).toBe(false);
  });
});
