// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { watchPolicyJob, type PolicyJob } from "@/lib/ai-stream/job";
import { readSse } from "@/lib/ai-stream/sse";

const PROXY_LIMIT_MS = 100_000; // Cloudflare cuts a response at 100 s
const JOB_MS = 150_000;
const enc = new TextEncoder();

function job(over: Partial<PolicyJob> = {}): PolicyJob {
  return {
    id: "j1",
    kind: "policy_suggest",
    status: "running",
    phase: "drafting",
    outputTokens: 0,
    createdAt: "",
    updatedAt: "",
    result: null,
    error: null,
    ...over,
  };
}

/** A manar-api job event stream behind a proxy that cuts every response after PROXY_LIMIT_MS. */
function simulate(serverMaxMs: number) {
  let current = job();
  const stats = { connections: 0, cutByProxy: 0, longestSilenceMs: 0, finishedAt: 0 };
  const started = Date.now();
  const worker = setInterval(() => {
    current = { ...current, outputTokens: current.outputTokens + 40 };
  }, 10_000);
  setTimeout(() => {
    clearInterval(worker);
    current = job({
      status: "ready",
      phase: "done",
      outputTokens: current.outputTokens,
      result: {
        available: true,
        policyId: "p1",
        versionId: "v1",
        explanation: null,
        confidence: 0.8,
        ruleCount: 3,
      },
    });
    stats.finishedAt = Date.now() - started;
  }, JOB_MS);

  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      if (!url.endsWith("/events")) throw new Error(`unexpected ${url}`);
      stats.connections++;
      const opened = Date.now();
      let lastByte = opened;
      const timers: ReturnType<typeof setInterval>[] = [];
      const stream = new ReadableStream<Uint8Array>({
        start(c) {
          const send = (text: string) => {
            stats.longestSilenceMs = Math.max(stats.longestSilenceMs, Date.now() - lastByte);
            lastByte = Date.now();
            c.enqueue(enc.encode(text));
          };
          let last = "";
          const end = () => {
            timers.forEach(clearInterval);
            try {
              c.close();
            } catch {
              /* already cut */
            }
          };
          send(": open\n\n");
          init?.signal?.addEventListener("abort", () => {
            timers.forEach(clearInterval);
            c.error(new DOMException("aborted", "AbortError"));
          });
          timers.push(
            setInterval(() => send(": heartbeat\n\n"), 10_000),
            setInterval(() => {
              const shown = `${current.status}|${current.outputTokens}`;
              if (current.status === "ready") {
                send(`event: done\ndata: ${JSON.stringify(current)}\n\n`);
                end();
              } else if (Date.now() - opened >= serverMaxMs) {
                send("event: reconnect\ndata: {}\n\n");
                end();
              } else if (shown !== last) {
                last = shown;
                send(`event: progress\ndata: ${JSON.stringify(current)}\n\n`);
              }
            }, 1000),
          );
          timers.push(
            setTimeout(() => {
              stats.cutByProxy++;
              timers.forEach(clearInterval);
              c.error(new TypeError("network error"));
            }, PROXY_LIMIT_MS) as unknown as ReturnType<typeof setInterval>,
          );
        },
        cancel() {
          timers.forEach(clearInterval);
        },
      });
      return Promise.resolve(
        new Response(stream, { headers: { "content-type": "text/event-stream" } }),
      );
    }),
  );
  return stats;
}

describe("a 150 second job behind a proxy that cuts every response at 100 seconds", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("is followed to ready when the server closes streams at 55 s", async () => {
    const stats = simulate(55_000);
    const seen: string[] = [];
    const run = watchPolicyJob("j1", { onState: (j) => seen.push(j.status) });
    await vi.advanceTimersByTimeAsync(JOB_MS + 10_000);
    const final = await run;
    expect(final).toMatchObject({ status: "ready", result: { versionId: "v1" } });
    expect(seen.at(-1)).toBe("ready");
    expect(stats.cutByProxy).toBe(0);
    expect(stats.connections).toBeGreaterThanOrEqual(3);
    expect(stats.longestSilenceMs).toBeLessThanOrEqual(15_000);
  });

  it("is followed to ready even when a connection is cut at 100 s", async () => {
    const stats = simulate(10 * 60_000);
    const run = watchPolicyJob("j1", { onState: () => undefined });
    await vi.advanceTimersByTimeAsync(JOB_MS + 10_000);
    const final = await run;
    expect(stats.cutByProxy).toBeGreaterThanOrEqual(1);
    expect(final).toMatchObject({ status: "ready", result: { policyId: "p1" } });
    expect(stats.longestSilenceMs).toBeLessThanOrEqual(15_000);
  });

  it("stops watching when the page aborts", async () => {
    simulate(55_000);
    const ctl = new AbortController();
    const run = watchPolicyJob("j1", { onState: () => undefined, signal: ctl.signal });
    const settled = run.then(
      () => "done",
      (e: unknown) => (e as Error).name,
    );
    await vi.advanceTimersByTimeAsync(5_000);
    ctl.abort();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(await settled).toBe("AbortError");
  });
});

describe("watchPolicyJob fallbacks", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("polls the job when the event stream keeps failing", async () => {
    vi.useFakeTimers();
    let polls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/events")) return Promise.reject(new TypeError("blocked by a proxy"));
        polls++;
        const status = polls >= 2 ? "ready" : "running";
        return Promise.resolve(Response.json({ job: job({ status }) }));
      }),
    );
    const run = watchPolicyJob("j1", { onState: () => undefined });
    await vi.advanceTimersByTimeAsync(60_000);
    expect((await run).status).toBe("ready");
    expect(polls).toBe(2);
    vi.useRealTimers();
  });

  it("throws on 404: the job expired or is not yours", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json({}, { status: 404 }))),
    );
    await expect(watchPolicyJob("j1", { onState: () => undefined })).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("readSse", () => {
  it("reassembles events split across chunks, drops heartbeats, tolerates CRLF", async () => {
    const parts = [
      ": heartbeat\r\n\r\nevent: delta\r\nda",
      'ta: {"t":"a"}\r\n\r\nevent: done\ndata: {"ok":',
      "true}\n\n",
    ];
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        parts.forEach((p) => c.enqueue(enc.encode(p)));
        c.close();
      },
    });
    const events: unknown[] = [];
    await readSse(body, (e) => events.push(e));
    expect(events).toEqual([
      { event: "delta", data: { t: "a" } },
      { event: "done", data: { ok: true } },
    ]);
  });
});
