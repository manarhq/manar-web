import { describe, expect, it, vi } from "vitest";

import {
  INITIAL_STATE,
  TOUR_STEPS,
  assistantAvailable,
  currentIndex,
  loadTourState,
  openAssistant,
  reduceTour,
  resolveTarget,
  saveTourState,
  stepsFor,
  storageKey,
  type TourAction,
  type TourState,
} from "@/components/manar/tutorial/engine";
import en from "@/messages/en/tutorial.json";
import ar from "@/messages/ar/tutorial.json";

const ALL_ROLES = [
  "TENANT_OWNER",
  "SECURITY_ADMIN",
  "AI_GOVERNANCE_MANAGER",
  "SOC_OPERATOR",
  "APPROVER",
  "AUDITOR",
];
const ids = (roles: string[], assistantAvailable = false) =>
  stepsFor({ roles, assistantAvailable }).map((step) => step.id);

function run(
  actions: TourAction[],
  steps = stepsFor({ roles: ALL_ROLES, assistantAvailable: false }),
) {
  return actions.reduce<TourState>(
    (state, action) => reduceTour(state, action, steps),
    INITIAL_STATE,
  );
}

describe("tutorial steps per role", () => {
  it("an approver gets the approval path: no agent, kill switch, policy or enrolment steps", () => {
    expect(ids(["APPROVER"])).toEqual([
      "welcome",
      "labels",
      "decision",
      "approval",
      "approvalsQueue",
      "auditOpen",
      "auditVerify",
      "auditExport",
      "finish",
    ]);
  });

  it("an admin also gets policy and agent enrolment", () => {
    const admin = ids(["SECURITY_ADMIN"]);
    expect(admin).toContain("policies");
    expect(admin).toContain("enrol");
    expect(admin).toContain("killSwitch");
    expect(admin).toContain("agentOpen");
  });

  it("an auditor sees agents and the record, but no kill switch or enrolment", () => {
    const auditor = ids(["AUDITOR"]);
    expect(auditor).toContain("agentIdentity");
    expect(auditor).toContain("auditExport");
    expect(auditor).not.toContain("killSwitch");
    expect(auditor).not.toContain("enrol");
    expect(auditor).not.toContain("approvalsQueue");
  });

  it("the assistant step appears only when the assistant is there", () => {
    expect(ids(ALL_ROLES)).not.toContain("assistant");
    expect(ids(ALL_ROLES, true)).toContain("assistant");
  });

  it("every step has a title and body in both locales, and every task has its copy", () => {
    for (const step of TOUR_STEPS) {
      for (const messages of [en, ar]) {
        const copy = (messages.steps as Record<string, Record<string, string>>)[step.id];
        expect(copy?.title, step.id).toBeTruthy();
        expect(copy?.body, step.id).toBeTruthy();
        if (step.task && step.task.kind !== "practice" && step.task.kind !== "assistant") {
          expect(copy.task, step.id).toBeTruthy();
        }
      }
    }
  });

  it("no em or en dashes in the tutorial copy", () => {
    expect(JSON.stringify(en)).not.toMatch(/[–—]/);
    expect(JSON.stringify(ar)).not.toMatch(/[–—]/);
  });
});

describe("tutorial state machine", () => {
  const steps = stepsFor({ roles: ALL_ROLES, assistantAvailable: false });

  it("starts at the first step", () => {
    expect(run([{ type: "start" }])).toEqual({
      status: "running",
      stepId: "welcome",
      completed: [],
    });
  });

  it("next and back move one step, back stops at the first", () => {
    expect(run([{ type: "start" }, { type: "next" }, { type: "next" }]).stepId).toBe(steps[2].id);
    expect(run([{ type: "start" }, { type: "next" }, { type: "back" }]).stepId).toBe("welcome");
    expect(run([{ type: "start" }, { type: "back" }]).stepId).toBe("welcome");
  });

  it("next on the last step finishes the tour", () => {
    const state = run([{ type: "start" }, ...steps.map(() => ({ type: "next" }) as const)]);
    expect(state.status).toBe("done");
    expect(state.stepId).toBeNull();
  });

  it("skipping a step with a task moves on without marking it complete", () => {
    const state = run([{ type: "start" }, { type: "next" }, { type: "next" }, { type: "next" }]);
    expect(state.completed).toEqual([]);
  });

  it("pause keeps the step, resume picks it up", () => {
    const paused = run([{ type: "start" }, { type: "next" }, { type: "pause" }]);
    expect(paused).toMatchObject({ status: "paused", stepId: steps[1].id });
    expect(reduceTour(paused, { type: "resume" }, steps)).toMatchObject({
      status: "running",
      stepId: steps[1].id,
    });
  });

  it("resume does nothing unless paused, so a finished tour stays finished", () => {
    const done = run([{ type: "start" }, ...steps.map(() => ({ type: "next" }) as const)]);
    expect(reduceTour(done, { type: "resume" }, steps)).toBe(done);
  });

  it("restart clears progress", () => {
    const state = run([
      { type: "start" },
      { type: "complete", id: "welcome" },
      { type: "next" },
      { type: "start" },
    ]);
    expect(state).toEqual({ status: "running", stepId: "welcome", completed: [] });
  });

  it("complete is recorded once", () => {
    const state = run([
      { type: "start" },
      { type: "complete", id: "decision" },
      { type: "complete", id: "decision" },
    ]);
    expect(state.completed).toEqual(["decision"]);
  });

  it("dismiss from the offer stops it coming back", () => {
    expect(run([{ type: "dismiss" }]).status).toBe("dismissed");
  });

  it("a stored step this user no longer has falls back to the first open step", () => {
    const state: TourState = {
      status: "paused",
      stepId: "assistant",
      completed: ["welcome", "labels"],
    };
    expect(steps[currentIndex(state, steps)].id).toBe("agentOpen");
    expect(reduceTour(state, { type: "resume" }, steps).stepId).toBe("agentOpen");
  });
});

describe("tutorial progress storage", () => {
  function memoryStorage(): Storage {
    const data = new Map<string, string>();
    return {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => void data.set(key, value),
      removeItem: (key) => void data.delete(key),
      clear: () => data.clear(),
      key: () => null,
      get length() {
        return data.size;
      },
    };
  }

  it("keys are per tenant and per user", () => {
    expect(storageKey("acme", "u1")).not.toBe(storageKey("acme", "u2"));
    expect(storageKey("acme", "u1")).not.toBe(storageKey("other", "u1"));
  });

  it("round-trips progress, and a reload mid-tour comes back paused", () => {
    const storage = memoryStorage();
    saveTourState(storage, "k", { status: "running", stepId: "decision", completed: ["welcome"] });
    expect(loadTourState(storage, "k")).toEqual({
      status: "paused",
      stepId: "decision",
      completed: ["welcome"],
    });
  });

  it("a first visit gets the offer", () => {
    expect(loadTourState(memoryStorage(), "k")).toEqual(INITIAL_STATE);
  });

  it("broken, foreign or throwing storage falls back to a fresh start", () => {
    const storage = memoryStorage();
    storage.setItem("bad", "{not json");
    storage.setItem("foreign", JSON.stringify({ status: "hacked", completed: [1] }));
    expect(loadTourState(storage, "bad")).toEqual(INITIAL_STATE);
    expect(loadTourState(storage, "foreign")).toEqual(INITIAL_STATE);
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
    } as unknown as Storage;
    expect(loadTourState(throwing, "k")).toEqual(INITIAL_STATE);
    expect(() => saveTourState(throwing, "k", INITIAL_STATE)).not.toThrow();
    expect(loadTourState(undefined, "k")).toEqual(INITIAL_STATE);
  });
});

describe("tutorial targets and assistant hook", () => {
  it("tries selectors in order and returns null for a centred step", () => {
    document.body.innerHTML = `<nav><a href="/en/agents">Agents</a></nav>`;
    const agentOpen = TOUR_STEPS.find((step) => step.id === "agentOpen")!;
    expect(resolveTarget(agentOpen)?.textContent).toBe("Agents");
    document.body.innerHTML += `<table data-tour="agents-table"></table>`;
    expect(resolveTarget(agentOpen)?.tagName).toBe("TABLE");
    const verify = TOUR_STEPS.find((step) => step.id === "auditVerify")!;
    expect(resolveTarget(verify)).toBeNull();
    expect(resolveTarget(TOUR_STEPS[0])).toBeNull();
    document.body.innerHTML = "";
  });

  it("uses window.openAssistant when present, otherwise the DOM event", () => {
    const listener = vi.fn();
    window.addEventListener("manar:assistant:open", listener);
    expect(assistantAvailable()).toBe(false);
    openAssistant("why?");
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ prompt: "why?" });

    const open = vi.fn();
    (window as Window & { openAssistant?: unknown }).openAssistant = open;
    expect(assistantAvailable()).toBe(true);
    openAssistant("why?");
    expect(open).toHaveBeenCalledWith("why?");
    expect(listener).toHaveBeenCalledTimes(1);
    delete (window as Window & { openAssistant?: unknown }).openAssistant;
    window.removeEventListener("manar:assistant:open", listener);
  });
});
