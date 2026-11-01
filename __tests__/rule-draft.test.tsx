import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import en from "@/messages/en/features.json";
import policies from "@/messages/en/policies.json";
import common from "@/messages/en/common.json";
import { RuleDraftDialog } from "@/components/manar/features/rule-draft-dialog";
import { MAX_DRAFT_CHARS, parseRuleDraft } from "@/lib/personal/rule-draft";

vi.mock("@/hooks/use-policies", () => ({
  useCreatePolicy: () => ({ mutate: vi.fn(), isPending: false, isError: false, reset: vi.fn() }),
}));

const rule = { toolId: "host.cursor", actionId: "bash", resourcePattern: "rm *", effect: "DENY" };

function show(raw: string | undefined) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <NextIntlClientProvider locale="en" messages={{ features: en, policies, common }}>
        <RuleDraftDialog draft={parseRuleDraft(raw)} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

afterEach(cleanup);

describe("rule draft", () => {
  it("accepts one valid rule and strips unknown fields", () => {
    const d = parseRuleDraft(JSON.stringify({ ...rule, evil: "x", __proto__: { a: 1 } }));
    expect(d.status).toBe("ok");
    if (d.status === "ok") {
      expect(d.contentYaml).not.toContain("evil");
      expect(JSON.parse(d.contentYaml).rules[0]).toMatchObject(rule);
    }
  });
  it("rejects malformed, wrong-shaped, oversized and repeated input", () => {
    for (const raw of [
      "{nope",
      "[]",
      JSON.stringify({ ...rule, effect: "MAYBE" }),
      JSON.stringify({ ...rule, toolId: "a b" }),
      "x".repeat(MAX_DRAFT_CHARS + 1),
    ]) {
      expect(parseRuleDraft(raw).status).toBe("invalid");
    }
    expect(parseRuleDraft(["a", "b"]).status).toBe("invalid");
    expect(parseRuleDraft(undefined).status).toBe("none");
  });
  it("a valid draft opens the editor pre-filled and saves nothing by itself", () => {
    show(JSON.stringify(rule));
    expect((screen.getByLabelText("Rules (YAML)") as HTMLTextAreaElement).value).toContain("rm *");
    expect(screen.getByText(/pre-filled from your approval/)).toBeTruthy();
  });
  it("a malformed draft shows the editor empty with a notice", () => {
    show("{nope");
    expect((screen.getByLabelText("Rules (YAML)") as HTMLTextAreaElement).value).toBe("");
    expect(screen.getByText(/could not read the rule/)).toBeTruthy();
  });
});
