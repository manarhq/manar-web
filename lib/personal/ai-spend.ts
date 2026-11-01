/** manar-api GET /ai-spend and PUT /ai-spend/settings. Amounts are list-price estimates in USD. */
export interface SpendRow {
  toolId: string;
  provider: string;
  model: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  priced: boolean;
}
export interface SpendPeriod {
  totalUsd: number;
  rows: SpendRow[];
}
export interface AiSpend {
  estimated: boolean;
  week: SpendPeriod;
  month: SpendPeriod;
  settings: {
    monthlyBudgetUsd: number | null;
    monthlyCapUsd: number | null;
    secretsMode: "mask" | "block";
    capScope: "owner" | "workspace";
  };
  budget: { usedPct: number | null; state: "none" | "ok" | "warning" | "over" };
  paused: string[];
}
export type SpendSettings = AiSpend["settings"];

/** A toolId as people read it: host.codex-cli -> codex-cli, other:unknown -> unknown. */
export function toolLabel(toolId: string): string {
  return toolId.replace(/^host\./, "").replace(/^other:/, "");
}

/** Empty or non-numeric input means "no limit"; a negative number is refused (null + false). */
export function parseUsd(raw: string): { value: number | null; ok: boolean } {
  const s = raw.trim();
  if (s === "") return { value: null, ok: true };
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 1_000_000
    ? { value: Math.round(n * 100) / 100, ok: true }
    : { value: null, ok: false };
}
