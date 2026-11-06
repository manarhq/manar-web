import { openStream, StreamHttpError } from "./sse";

export type JobStatus = "queued" | "running" | "ready" | "failed" | "cancelled";

export interface PolicyJob {
  id: string;
  kind: "policy_suggest";
  status: JobStatus;
  phase: "queued" | "drafting" | "saving" | "done";
  /** Estimated from the characters written so far. */
  outputTokens: number;
  createdAt: string;
  updatedAt: string;
  result: {
    available: boolean;
    policyId: string | null;
    versionId: string | null;
    explanation: string | null;
    confidence: number | null;
    ruleCount: number;
  } | null;
  /** A fixed code: `model_unavailable`, `internal`, `stalled`, `not_started`. */
  error: string | null;
}

const TERMINAL: JobStatus[] = ["ready", "failed", "cancelled"];
export const isTerminal = (job: Pick<PolicyJob, "status">) => TERMINAL.includes(job.status);

const jobUrl = (id: string) => `/api/bff/policies/suggest/jobs/${id}`;

export async function startPolicyJob(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<PolicyJob> {
  const response = await fetch("/api/bff/policies/suggest/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok)
    throw new StreamHttpError(response.status, await response.json().catch(() => null));
  const payload = (await response.json()) as { job: PolicyJob | null };
  // No job: AI is switched off for the workspace (`reason: "ai_switched_off"`); the caller shows it.
  if (!payload.job) throw new StreamHttpError(response.status, payload);
  return payload.job;
}

export async function getPolicyJob(id: string, signal?: AbortSignal): Promise<PolicyJob> {
  const response = await fetch(jobUrl(id), { signal, cache: "no-store" });
  if (!response.ok)
    throw new StreamHttpError(response.status, await response.json().catch(() => null));
  return ((await response.json()) as { job: PolicyJob }).job;
}

export async function cancelPolicyJob(id: string): Promise<void> {
  await fetch(jobUrl(id), { method: "DELETE" });
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("aborted", "AbortError"));
      },
      { once: true },
    );
  });

/**
 * Follows a job to its end and resolves with the final state. The event stream is a view of the
 * stored job: manar-api closes it after about 55 s with `reconnect`, and a proxy may cut it sooner
 * (Cloudflare at 100 s), so this opens it again whenever it ends before `done`, and nothing is
 * lost. After three failed connections in a row (stream blocked by a proxy, say) it polls the
 * job every 3 s instead. A 404 means the job is gone (expired or not yours) and is thrown.
 */
export async function watchPolicyJob(
  id: string,
  options: { signal?: AbortSignal; onState: (job: PolicyJob) => void },
): Promise<PolicyJob> {
  let final: PolicyJob | undefined;
  let failures = 0;
  while (!final) {
    options.signal?.throwIfAborted();
    if (failures >= 3) {
      const job = await getPolicyJob(id, options.signal);
      options.onState(job);
      if (isTerminal(job)) return job;
      await wait(3000, options.signal);
      continue;
    }
    try {
      await openStream(`${jobUrl(id)}/events`, {
        signal: options.signal,
        onEvent: ({ event, data }) => {
          if (event === "progress" || event === "done") {
            const job = data as PolicyJob;
            options.onState(job);
            if (event === "done" || isTerminal(job)) final = job;
          }
        },
      });
      failures = 0;
    } catch (error) {
      if (options.signal?.aborted) throw error;
      if (error instanceof StreamHttpError && error.status === 404) throw error;
      failures++;
    }
    if (!final)
      await wait(failures === 0 ? 300 : Math.min(5000, 500 * 2 ** failures), options.signal);
  }
  return final;
}
