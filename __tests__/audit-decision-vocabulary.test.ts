import { describe, expect, it } from "vitest";

import enAudit from "@/messages/en/audit.json";
import arAudit from "@/messages/ar/audit.json";
import { AUDIT_DECISIONS, isKnownAuditDecision } from "@/lib/audit-decision";

/**
 * CLAUDE.md §7 mandates `APPROVAL_REQUIRED`. Audit events are append-only and
 * hash-chained, so events written before the Phase 1 rename still carry
 * `REQUIRE_APPROVAL` and always will. The console must render both, in both
 * locales, or historical audit rows show a missing-translation artifact.
 */
describe("audit decision vocabulary", () => {
  it("recognises the CLAUDE.md §7 identifier", () => {
    expect(isKnownAuditDecision("APPROVAL_REQUIRED")).toBe(true);
  });

  it("still recognises the historical identifier", () => {
    expect(isKnownAuditDecision("REQUIRE_APPROVAL")).toBe(true);
  });

  it("does not recognise a near-miss", () => {
    expect(isKnownAuditDecision("APPROVALREQUIRED")).toBe(false);
    expect(isKnownAuditDecision("approval_required")).toBe(false);
  });

  it.each(["en", "ar"] as const)("has a translation for every known decision in %s", (locale) => {
    const messages: Record<string, unknown> = locale === "en" ? enAudit : arAudit;
    const decisions = Object.values(messages).find(
      (section): section is Record<string, string> =>
        typeof section === "object" &&
        section !== null &&
        "APPROVAL_REQUIRED" in (section as Record<string, unknown>),
    );

    expect(decisions).toBeDefined();
    for (const value of AUDIT_DECISIONS) {
      expect(decisions?.[value], `${locale} is missing ${value}`).toBeTruthy();
    }
  });

  it("renders both spellings with the same label, so history reads consistently", () => {
    const decisions = Object.values(enAudit as Record<string, unknown>).find(
      (section): section is Record<string, string> =>
        typeof section === "object" &&
        section !== null &&
        "APPROVAL_REQUIRED" in (section as object),
    );

    expect(decisions?.APPROVAL_REQUIRED).toBe(decisions?.REQUIRE_APPROVAL);
  });
});
