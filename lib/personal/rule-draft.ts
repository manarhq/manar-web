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

/** `raw` is the decoded `draft` query value. Anything that is not exactly one valid rule is
 * "invalid": the editor opens empty with a notice. */
export function parseRuleDraft(raw: string | string[] | undefined): ParsedDraft {
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
    (rule.toolId === "*" || rule.actionId === "*" || rule.resourcePattern.includes("*"))
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
