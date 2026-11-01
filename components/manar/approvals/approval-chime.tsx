"use client";

import { useChime } from "@/hooks/use-chime";
import { usePendingApprovals } from "@/hooks/use-pending-approvals-count";

/** Mounted once in the shell: the opt-in chime for a new waiting approval. Renders nothing. */
export function ApprovalChime() {
  useChime(usePendingApprovals().count);
  return null;
}
