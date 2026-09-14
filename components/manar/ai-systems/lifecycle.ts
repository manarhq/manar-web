import type { AiSystemLifecycleState } from "@/hooks/use-ai-systems";

/**
 * A client-side mirror of manar-api's server-enforced lifecycle graph
 * (`src/ai-systems/ai-systems.service.ts`'s `ALLOWED_TRANSITIONS`), kept
 * here for one reason only: so this console never *offers* an edge the
 * server would reject with a 409. It is a UX nicety, exactly like
 * `lib/roles.ts`'s `canGrantRole` — `POST /ai-systems/:id/transitions`
 * re-derives and re-checks this same table on every request regardless of
 * what the UI computed, and a 409 that arrives anyway is rendered as a
 * real, actionable message rather than swallowed.
 *
 * `RETIRED` has no outgoing edges: retirement is terminal so a retired
 * system's evidence trail stays fixed.
 */
export const ALLOWED_TRANSITIONS: Readonly<
  Record<AiSystemLifecycleState, readonly AiSystemLifecycleState[]>
> = {
  DRAFT: ["REVIEW", "RETIRED"],
  REVIEW: ["ACTIVE", "DRAFT", "RETIRED"],
  ACTIVE: ["SUSPENDED", "RETIRED"],
  SUSPENDED: ["ACTIVE", "RETIRED"],
  RETIRED: [],
};

export function allowedTransitions(
  from: AiSystemLifecycleState,
): readonly AiSystemLifecycleState[] {
  return ALLOWED_TRANSITIONS[from];
}

export function isTerminal(state: AiSystemLifecycleState): boolean {
  return ALLOWED_TRANSITIONS[state].length === 0;
}

/**
 * `REVIEW -> ACTIVE` is the one edge manar-api subjects to a
 * separation-of-duties check: it must be performed by a different user
 * than the one who submitted the system for review, or the review state
 * is decorative. Every other edge is deliberately *not* covered (an
 * operator suspending a system they activated is a legitimate, urgent
 * action).
 */
export function requiresSecondReviewer(
  from: AiSystemLifecycleState,
  to: AiSystemLifecycleState,
): boolean {
  return from === "REVIEW" && to === "ACTIVE";
}

/**
 * The distinct failure modes a transition can come back with. Each maps
 * to its own message, because "forbidden" is not an action an operator
 * can take: a separation-of-duties rejection needs a *different
 * authorized reviewer*, which is a completely different next step from
 * "you do not hold a role that may do this".
 */
export type TransitionFailure =
  "notAllowedEdge" | "separationOfDuties" | "insufficientRole" | "notFound" | "unknown";

export interface TransitionFailureInput {
  status: number | undefined;
  /** The server's own message, used only as an extra positive signal for
   * separation of duties — never as the sole discriminator, since it is
   * English-only prose that could change. */
  message?: string;
  from: AiSystemLifecycleState;
  to: AiSystemLifecycleState;
  /** Whether the signed-in user holds one of the three roles that may
   * write to this resource. */
  callerCanManage: boolean;
}

export function classifyTransitionFailure({
  status,
  message,
  from,
  to,
  callerCanManage,
}: TransitionFailureInput): TransitionFailure {
  // 409: the edge is not in the server's allowed-transition table. In
  // practice this means the record moved underneath this page.
  if (status === 409) return "notAllowedEdge";
  if (status === 404) return "notFound";
  if (status === 403) {
    // The API returns 403 for both an insufficient role and a
    // separation-of-duties rejection. They are told apart structurally:
    // the console only offers a transition to a user who holds a write
    // role, and REVIEW -> ACTIVE is the only edge carrying the rule.
    if (message && /different user/i.test(message)) return "separationOfDuties";
    if (callerCanManage && requiresSecondReviewer(from, to)) return "separationOfDuties";
    return "insufficientRole";
  }
  return "unknown";
}
