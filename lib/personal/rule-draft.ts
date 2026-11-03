import { z } from "zod";

/** Mirrors manar-api's PolicyRuleSchema (src/policy/policy-content.schema.ts). Unknown fields are
 * stripped; nothing is evaluated. The server validates again on save. */
const ID = z
  .string()
  .min(1)
  .max(128)
  .refine((v) => v === "*" || /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(v));

const RuleDraft = z.object({
  name: z.string().min(1).max(200).optional(),
  toolId: ID,
  actionId: ID,
  resourcePattern: z.string().min(1).max(2048).default("*"),
  resourceClassification: z.enum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"]).optional(),
  effect: z.enum(["ALLOW", "DENY", "APPROVAL_REQUIRED"]),
  riskWeight: z.number().min(0).max(100).optional(),
  riskFloor: z.number().min(0).max(100).optional(),
  description: z.string().max(2000).optional(),
});

export type RuleDraft = z.infer<typeof RuleDraft>;
export const MAX_DRAFT_CHARS = 4000;

export type ParsedDraft =
  { status: "none" } | { status: "invalid" } | { status: "ok"; name: string; contentYaml: string };

/** Glob-like characters. The server only treats `*` as special, but a draft from a link refuses
 * all of them in an ALLOW rule, so no later matcher change can turn a link into a broad allow. */
const GLOB = /[*?[\]{}!]/;

/**
 * `raw` is the decoded `draft` value. Anything that is not exactly one valid rule is "invalid": the
 * editor opens empty with a notice.
 *
 * `fromLink` (the default) is a draft that arrived in a URL, which anyone can send: an ALLOW rule
 * is refused if its tool or action is `*` or its resource holds any glob-like character. A draft
 * the console itself made ("Approve + make rule", passed through sessionStorage, see
 * `stashRuleDraft`) may hold those characters literally, but still never a wildcard ALLOW.
 */
export function parseRuleDraft(
  raw: string | string[] | undefined,
  { fromLink = true }: { fromLink?: boolean } = {},
): ParsedDraft {
  if (raw === undefined) return { status: "none" };
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_DRAFT_CHARS) {
    return { status: "invalid" };
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { status: "invalid" };
  }
  const parsed = RuleDraft.safeParse(json);
  if (!parsed.success) return { status: "invalid" };
  const rule = parsed.data;
  // A draft can arrive by link: never let one pre-fill an ALLOW wider than one exact action
  // (security audit, 3 Nov 2026). Approve + make rule only ever builds exact drafts.
  if (
    rule.effect === "ALLOW" &&
    (rule.toolId === "*" ||
      rule.actionId === "*" ||
      (fromLink ? GLOB.test(rule.resourcePattern) : rule.resourcePattern.includes("*")))
  ) {
    return { status: "invalid" };
  }
  // JSON is valid YAML, so the policy editor's YAML field takes it as is.
  return {
    status: "ok",
    name: rule.name ?? "",
    contentYaml: JSON.stringify({ rules: [rule] }, null, 2),
  };
}

const STASH = "manar.ruleDraft.";

/**
 * "Approve + make rule" hands its draft to the rules page through this tab's sessionStorage, not
 * the URL: the URL carries only a random reference, so a link from someone else pre-fills nothing.
 */
export function stashRuleDraft(draft: unknown): string {
  const ref = crypto.randomUUID();
  window.sessionStorage.setItem(STASH + ref, JSON.stringify(draft));
  return ref;
}

/** Reads a stashed draft once (it is removed), or undefined. */
export function takeRuleDraft(ref: string): string | undefined {
  if (!/^[0-9a-f-]{36}$/.test(ref)) return undefined;
  const raw = window.sessionStorage.getItem(STASH + ref) ?? undefined;
  window.sessionStorage.removeItem(STASH + ref);
  return raw;
}
