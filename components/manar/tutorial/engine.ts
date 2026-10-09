/**
 * Console tutorial: step list and state machine. Pure, so the unit tests
 * cover it without a DOM. Copy lives in messages/{locale}/tutorial.json under
 * `steps.<id>`.
 *
 * Targets are CSS selectors tried in order; the first one present in the
 * page wins. `data-tour` attributes are the stable contract with page
 * owners; the sidebar links are matched by href so they work today. A step
 * whose target is missing renders centred instead.
 */

export type PracticeKind = "decision" | "approval" | "killswitch";

export type StepTask =
  | { kind: "path"; pattern: RegExp }
  | { kind: "click"; selector: string }
  | { kind: "practice"; practice: PracticeKind }
  | { kind: "assistant" };

export interface TourStep {
  id: string;
  targets?: string[];
  /** Page the target lives on: the card offers a link there when the target is missing. */
  href?: string;
  side?: "top" | "bottom" | "inline-end";
  task?: StepTask;
  /** Shown only to users holding at least one of these roles. Omitted: everyone. */
  roles?: readonly string[];
}

const ADMINS = ["TENANT_OWNER", "SECURITY_ADMIN"] as const;
const POLICY_EDITORS = [...ADMINS, "AI_GOVERNANCE_MANAGER"] as const;
const OPERATORS = [...POLICY_EDITORS, "SOC_OPERATOR"] as const;
/** Everyone except an approver-only account: they get the approval-focused path. */
const NOT_APPROVER_ONLY = [...OPERATORS, "AUDITOR", "DEVELOPER", "READ_ONLY"] as const;

const nav = (href: string) => `nav a[href$="${href}"]`;

export const TOUR_STEPS: readonly TourStep[] = [
  { id: "welcome" },
  { id: "labels", targets: ['[data-tour="enforcement-labels"]'], href: "/overview" },
  {
    id: "agentOpen",
    targets: ['[data-tour="agents-table"]', nav("/agents")],
    href: "/agents",
    side: "inline-end",
    task: { kind: "path", pattern: /^\/agents\/[^/]+$/ },
    roles: NOT_APPROVER_ONLY,
  },
  { id: "agentIdentity", targets: ['[data-tour="agent-identity"]'], roles: NOT_APPROVER_ONLY },
  { id: "decision", task: { kind: "practice", practice: "decision" } },
  { id: "approval", task: { kind: "practice", practice: "approval" } },
  {
    id: "approvalsQueue",
    targets: ['[data-tour="approvals-queue"]', nav("/approvals")],
    side: "inline-end",
    task: { kind: "path", pattern: /^\/approvals$/ },
    roles: [...OPERATORS, "APPROVER"],
  },
  { id: "killSwitch", task: { kind: "practice", practice: "killswitch" }, roles: OPERATORS },
  {
    id: "auditOpen",
    targets: [nav("/audit")],
    side: "inline-end",
    task: { kind: "path", pattern: /^\/audit$/ },
  },
  {
    id: "auditVerify",
    targets: ['[data-tour="audit-verify"]'],
    href: "/audit",
    task: { kind: "click", selector: '[data-tour="audit-verify"]' },
  },
  {
    id: "auditExport",
    targets: ['[data-tour="audit-export"]'],
    href: "/audit",
    task: { kind: "click", selector: '[data-tour="audit-export"]' },
  },
  {
    id: "policies",
    targets: ['[data-tour="policy-version"]', nav("/policies")],
    side: "inline-end",
    task: { kind: "path", pattern: /^\/policies(\/[^/]+)?$/ },
    roles: POLICY_EDITORS,
  },
  { id: "enrol", targets: ['[data-tour="agent-enrol"]'], href: "/agents", roles: ADMINS },
  { id: "assistant", targets: ['[data-tour="assistant"]'], task: { kind: "assistant" } },
  { id: "finish" },
];

export interface StepFilter {
  roles: readonly string[];
  assistantAvailable: boolean;
}

export function stepsFor({ roles, assistantAvailable }: StepFilter): TourStep[] {
  return TOUR_STEPS.filter(
    (step) =>
      (!step.roles || step.roles.some((role) => roles.includes(role))) &&
      (step.task?.kind !== "assistant" || assistantAvailable),
  );
}

/** offer: first visit, not answered yet. dismissed: "Not now" or ended. */
export type TourStatus = "offer" | "running" | "paused" | "done" | "dismissed";

export interface TourState {
  status: TourStatus;
  stepId: string | null;
  completed: string[];
}

export const INITIAL_STATE: TourState = { status: "offer", stepId: null, completed: [] };

export type TourAction =
  | { type: "start" }
  | { type: "next" }
  | { type: "back" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "dismiss" }
  | { type: "complete"; id: string };

/**
 * Index of the current step. When the stored step is not in this user's list
 * (roles changed, or the assistant went away) the tour carries on from the
 * first step not yet done.
 */
export function currentIndex(state: TourState, steps: readonly TourStep[]): number {
  if (state.stepId === null) return -1;
  const index = steps.findIndex((step) => step.id === state.stepId);
  if (index >= 0) return index;
  const firstOpen = steps.findIndex((step) => !state.completed.includes(step.id));
  return firstOpen >= 0 ? firstOpen : 0;
}

export function reduceTour(
  state: TourState,
  action: TourAction,
  steps: readonly TourStep[],
): TourState {
  const index = currentIndex(state, steps);
  switch (action.type) {
    case "start":
      return { status: "running", stepId: steps[0]?.id ?? null, completed: [] };
    case "next": {
      const next = steps[index + 1];
      return next
        ? { ...state, status: "running", stepId: next.id }
        : { ...state, status: "done", stepId: null };
    }
    case "back":
      return index > 0 ? { ...state, stepId: steps[index - 1].id } : state;
    case "pause":
      return state.status === "running" ? { ...state, status: "paused" } : state;
    case "resume":
      if (state.status !== "paused") return state;
      return { ...state, status: "running", stepId: steps[Math.max(index, 0)]?.id ?? null };
    case "dismiss":
      return { ...state, status: "dismissed" };
    case "complete":
      return state.completed.includes(action.id)
        ? state
        : { ...state, completed: [...state.completed, action.id] };
  }
}

const STATUSES: readonly TourStatus[] = ["offer", "running", "paused", "done", "dismissed"];

/** One key per tenant and user: the console serves every tenant from one origin. */
export function storageKey(scope: string, userId: string): string {
  return `manar.tutorial.v1:${scope}:${userId}`;
}

/** Storage can be missing or throw (private window, blocked site data): the tour then just starts fresh. */
export function loadTourState(storage: Storage | undefined, key: string): TourState {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as Partial<TourState>;
    if (!parsed || !STATUSES.includes(parsed.status as TourStatus)) return INITIAL_STATE;
    return {
      // Reloading mid-tour comes back paused, so the console is never covered on load.
      status: parsed.status === "running" ? "paused" : (parsed.status as TourStatus),
      stepId: typeof parsed.stepId === "string" ? parsed.stepId : null,
      completed: Array.isArray(parsed.completed)
        ? parsed.completed.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return INITIAL_STATE;
  }
}

export function saveTourState(storage: Storage | undefined, key: string, state: TourState): void {
  try {
    storage?.setItem(key, JSON.stringify(state));
  } catch {
    // Quota or blocked storage: progress is kept for this page view only.
  }
}

/** First selector that matches an element in the document, or null for a centred step. */
export function resolveTarget(step: TourStep, root: ParentNode = document): Element | null {
  for (const selector of step.targets ?? []) {
    const element = root.querySelector(selector);
    if (element) return element;
  }
  return null;
}

/** The AS agent's assistant: a global function, or a trigger the page renders. */
export function assistantAvailable(win: Window = window): boolean {
  const open = (win as Window & { openAssistant?: unknown }).openAssistant;
  return typeof open === "function" || !!win.document.querySelector('[data-tour="assistant"]');
}

export function openAssistant(prompt: string, win: Window = window): void {
  const open = (win as Window & { openAssistant?: (prompt?: string) => void }).openAssistant;
  if (typeof open === "function") open(prompt);
  else win.dispatchEvent(new CustomEvent("manar:assistant:open", { detail: { prompt } }));
}
