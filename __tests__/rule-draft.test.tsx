import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import en from "@/messages/en/features.json";
import policies from "@/messages/en/policies.json";
import common from "@/messages/en/common.json";
import { RuleDraftDialog } from "@/components/manar/features/rule-draft-dialog";
import {
  MAX_DRAFT_CHARS,
  parseRuleDraft,
  stashRuleDraft,
  takeRuleDraft,
} from "@/lib/personal/rule-draft";

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
  it("refuses a wildcard ALLOW draft, which a link could use to pre-fill allow-all", () => {
    for (const over of [{ toolId: "*" }, { actionId: "*" }, { resourcePattern: "repo/*" }]) {
      const draft = { toolId: "t", actionId: "a", resourcePattern: "x", effect: "ALLOW", ...over };
      expect(parseRuleDraft(JSON.stringify(draft)).status).toBe("invalid");
    }
    expect(
      parseRuleDraft(
        JSON.stringify({ toolId: "*", actionId: "*", resourcePattern: "*", effect: "DENY" }),
      ).status,
    ).toBe("ok");
  });

  it("a link cannot pre-fill an ALLOW with any glob-like character (? [ ] { } !)", () => {
    for (const resourcePattern of ["repo/?", "repo/[a-z]", "repo/{a,b}", "!repo", "repo/x]"]) {
      const draft = { toolId: "t", actionId: "a", resourcePattern, effect: "ALLOW" };
      expect(parseRuleDraft(JSON.stringify(draft)).status).toBe("invalid");
    }
    // The console's own draft (from sessionStorage) may hold them literally, never a wildcard.
    const exact = {
      toolId: "t",
      actionId: "a",
      resourcePattern: "https://x/?q=1",
      effect: "ALLOW",
    };
    expect(parseRuleDraft(JSON.stringify(exact), { fromLink: false }).status).toBe("ok");
    expect(
      parseRuleDraft(JSON.stringify({ ...exact, resourcePattern: "repo/*" }), { fromLink: false })
        .status,
    ).toBe("invalid");
  });

  it("Approve + make rule passes its draft through this tab, never the URL; a stray reference fills nothing", async () => {
    const exact = { toolId: "t", actionId: "a", resourcePattern: "repo/x", effect: "ALLOW" };
    const ref = stashRuleDraft(exact);
    expect(ref).toMatch(/^[0-9a-f-]{36}$/);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <NextIntlClientProvider locale="en" messages={{ features: en, policies, common }}>
          <RuleDraftDialog draft={{ status: "none" }} draftRef={ref} />
        </NextIntlClientProvider>
      </QueryClientProvider>,
    );
    expect(((await screen.findByLabelText("Rules (YAML)")) as HTMLTextAreaElement).value).toContain(
      "repo/x",
    );
    // Read once: the same reference again (a copied link) gives nothing.
    expect(takeRuleDraft(ref)).toBeUndefined();
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
