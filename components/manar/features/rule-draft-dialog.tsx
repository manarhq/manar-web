"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { CreatePolicyDialog } from "@/components/manar/policies/create-policy-dialog";
import { parseRuleDraft, takeRuleDraft, type ParsedDraft } from "@/lib/personal/rule-draft";

const NONE: ParsedDraft = { status: "none" };
const noop = () => () => {};
/** A stashed draft is read (and removed) once; the parsed result is kept for re-renders. */
const taken = new Map<string, ParsedDraft>();
function stashedDraft(ref: string): ParsedDraft {
  let d = taken.get(ref);
  if (!d) {
    d = parseRuleDraft(takeRuleDraft(ref) ?? "", { fromLink: false });
    taken.set(ref, d);
  }
  return d;
}

/** Opens the policy editor from `/rules?draftRef=` (a draft this tab stashed, from "Approve + make
 * rule") or `/rules?draft=` (a link: strict, see parseRuleDraft). A valid draft pre-fills it; a
 * malformed one opens it empty with a notice. Either way the person must press Create. */
export function RuleDraftDialog({
  draft: fromUrl,
  draftRef,
}: {
  draft: ParsedDraft;
  draftRef?: string;
}) {
  const t = useTranslations("features.rules");
  // sessionStorage exists only in the browser (the server renders nothing for a reference); a
  // reference with nothing behind it (a link from another tab or person) pre-fills nothing.
  const stashed = useSyncExternalStore(
    noop,
    () => (draftRef ? stashedDraft(draftRef) : NONE),
    () => NONE,
  );
  const draft = draftRef ? stashed : fromUrl;
  if (draft.status === "none") return null;
  if (draft.status === "invalid") {
    return (
      <CreatePolicyDialog
        startOpen
        notice={t("draftInvalid")}
        draft={{ name: "", contentYaml: "" }}
      />
    );
  }
  return (
    <CreatePolicyDialog
      startOpen
      notice={t("draftReady")}
      draft={{ name: draft.name, contentYaml: draft.contentYaml }}
    />
  );
}
