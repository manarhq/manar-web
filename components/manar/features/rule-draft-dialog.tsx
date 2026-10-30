"use client";

import { useTranslations } from "next-intl";

import { CreatePolicyDialog } from "@/components/manar/policies/create-policy-dialog";
import type { ParsedDraft } from "@/lib/personal/rule-draft";

/** Opens the policy editor from `/rules?draft=`. A valid draft pre-fills it; a malformed one
 * opens it empty with a notice. Either way the person must press Create. */
export function RuleDraftDialog({ draft }: { draft: ParsedDraft }) {
  const t = useTranslations("features.rules");
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
