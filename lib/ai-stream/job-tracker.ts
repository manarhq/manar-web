import { cancelPolicyJob, isTerminal, watchPolicyJob, type PolicyJob } from "./job";
import { StreamHttpError } from "./sse";

/**
 * Background AI jobs the console is following, outside any component so a job keeps being
 * followed when the dialog that started it closes or the person moves to another page. The ids
 * (never any text) are kept in localStorage so a reload resumes them; a job that no longer exists
 * (expired after 24 h, or started by someone else on this browser) answers 404 and is dropped.
 */
const STORAGE_KEY = "manar:ai-jobs";

const jobs = new Map<string, PolicyJob>();
const watching = new Map<string, AbortController>();
/** Jobs a dialog is showing itself: the notifier stays quiet for them. */
const claimed = new Set<string>();
const listeners = new Set<() => void>();
const terminalListeners = new Set<(job: PolicyJob) => void>();

function stored(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === "string").slice(-10)
      : [];
  } catch {
    return [];
  }
}
function persist(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(-10)));
  } catch {
    // Storage blocked: the job still finishes, it just is not resumed after a reload.
  }
}
const emit = () => listeners.forEach((l) => l());

export function getJob(id: string | null): PolicyJob | undefined {
  return id ? jobs.get(id) : undefined;
}
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function onJobTerminal(listener: (job: PolicyJob) => void): () => void {
  terminalListeners.add(listener);
  return () => terminalListeners.delete(listener);
}
export const claimJob = (id: string) => void claimed.add(id);
export const releaseJob = (id: string) => void claimed.delete(id);
export const isClaimed = (id: string) => claimed.has(id);

/** Starts following `job` (idempotent). Notifies `onJobTerminal` listeners once, when it ends. */
export function trackPolicyJob(job: PolicyJob): void {
  jobs.set(job.id, job);
  persist([...new Set([...stored(), job.id])]);
  emit();
  if (watching.has(job.id)) return;
  const ctl = new AbortController();
  watching.set(job.id, ctl);
  void watchPolicyJob(job.id, {
    signal: ctl.signal,
    onState: (next) => {
      jobs.set(next.id, next);
      emit();
    },
  })
    .then((final) => {
      jobs.set(final.id, final);
      terminalListeners.forEach((l) => l(final));
    })
    .catch((error: unknown) => {
      // Gone (404) or aborted: nothing more to say.
      if (!(error instanceof StreamHttpError) && !ctl.signal.aborted) return;
    })
    .finally(() => {
      watching.delete(job.id);
      claimed.delete(job.id);
      persist(stored().filter((id) => id !== job.id));
      emit();
    });
}

/** Re-follows the jobs left in storage by an earlier page load. */
export function resumeTrackedJobs(): void {
  for (const id of stored()) {
    if (watching.has(id)) continue;
    trackPolicyJob({
      id,
      kind: "policy_suggest",
      status: "running",
      phase: "drafting",
      outputTokens: 0,
      createdAt: "",
      updatedAt: "",
      result: null,
      error: null,
    });
  }
}

/** Asks the server to stop the job; the watcher then sees it end as `cancelled`. */
export async function stopPolicyJob(id: string): Promise<void> {
  await cancelPolicyJob(id);
}

export { isTerminal };
