import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AiSpendView } from "@/components/manar/ai-tools/ai-spend-view";
import { parseUsd, toolLabel, type AiSpend } from "@/lib/personal/ai-spend";
import personalAr from "@/messages/ar/personal.json";
import personalEn from "@/messages/en/personal.json";

const state = vi.hoisted(() => ({ data: undefined as unknown, mutate: vi.fn() }));
vi.mock("@/hooks/use-ai-spend", () => ({
  useAiSpend: () => ({ data: state.data, isLoading: false, isError: false }),
  useSaveSpendSettings: () => ({
    mutate: state.mutate,
    isPending: false,
    isError: false,
    isSuccess: false,
  }),
}));

const row = (model: string, costUsd: number, priced = true) => ({
  toolId: "host.codex-cli",
  provider: "openai",
  model,
  requests: 3,
  inputTokens: 1000,
  outputTokens: 500,
  costUsd,
  priced,
});
const data = (over: Partial<AiSpend> = {}): AiSpend => ({
  estimated: true,
  week: { totalUsd: 1.5, rows: [row("gpt-5", 1.5)] },
  month: { totalUsd: 4.5, rows: [row("gpt-5", 4), row("odd-model", 0, false)] },
  settings: { monthlyBudgetUsd: 5, monthlyCapUsd: 10, secretsMode: "mask", capScope: "owner" },
  budget: { usedPct: 90, state: "warning" },
  paused: [],
  ...over,
});

function view() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ personal: personalEn }}>
      <AiSpendView />
    </NextIntlClientProvider>,
  );
}
afterEach(() => {
  cleanup();
  state.mutate.mockReset();
});

describe("AI spend", () => {
  it("shows cost per tool and model, marks unpriced models and warns near the budget", () => {
    state.data = data();
    view();
    expect(screen.getAllByText("codex-cli").length).toBeGreaterThan(0);
    expect(screen.getByText("not priced")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("90%");
  });

  it("names paused tools", () => {
    state.data = data({ paused: ["host.codex-cli"], budget: { usedPct: null, state: "none" } });
    view();
    expect(screen.getByRole("alert").textContent).toContain("codex-cli");
  });

  it("saves the budget, cap and block switch; refuses a negative amount", () => {
    state.data = data({ budget: { usedPct: 10, state: "ok" } });
    view();
    fireEvent.change(screen.getByLabelText("Monthly budget (USD)"), { target: { value: "-1" } });
    expect(screen.getByRole("button", { name: "Save" }).hasAttribute("disabled")).toBe(true);
    fireEvent.change(screen.getByLabelText("Monthly budget (USD)"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Monthly cap per tool (USD)"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getAllByRole("switch")[1]!); // block secrets
    fireEvent.click(screen.getAllByRole("switch")[0]!); // cap across the workspace
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(state.mutate).toHaveBeenCalledWith({
      monthlyBudgetUsd: 20,
      monthlyCapUsd: null,
      secretsMode: "block",
      capScope: "workspace",
    });
  });
});

describe("helpers and messages", () => {
  it("parses amounts", () => {
    expect(parseUsd("")).toEqual({ value: null, ok: true });
    expect(parseUsd("12.345")).toEqual({ value: 12.35, ok: true });
    expect(parseUsd("abc").ok).toBe(false);
    expect(toolLabel("host.codex-cli")).toBe("codex-cli");
  });
  it("has the same keys in English and Arabic", () => {
    expect(Object.keys(personalAr.aiSpend).sort()).toEqual(Object.keys(personalEn.aiSpend).sort());
    expect(personalAr.aiTools.spendLink).toBeTruthy();
  });
});
