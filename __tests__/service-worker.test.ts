import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Runs the real public/sw.js against a fake worker scope and checks what it will open.
function load() {
  const handlers: Record<string, (e: unknown) => void> = {};
  const shown: { title: string; opts: { data: { url: string } } }[] = [];
  const opened: string[] = [];
  const self = {
    location: { origin: "https://console.example" },
    addEventListener: (n: string, h: (e: unknown) => void) => (handlers[n] = h),
    skipWaiting: () => undefined,
    clients: {
      claim: () => Promise.resolve(),
      matchAll: () => Promise.resolve([]),
      openWindow: (u: string) => (opened.push(u), Promise.resolve()),
    },
    registration: {
      showNotification: (title: string, opts: { data: { url: string } }) => (
        shown.push({ title, opts }),
        Promise.resolve()
      ),
    },
  };
  new Function("self", readFileSync("public/sw.js", "utf8"))(self);
  const run = (name: string, e: Record<string, unknown>) => {
    let p: Promise<unknown> | undefined;
    handlers[name]!({ ...e, waitUntil: (x: Promise<unknown>) => (p = x) });
    return p;
  };
  return { run, shown, opened };
}

describe("service worker", () => {
  it("only opens paths on its own origin", async () => {
    for (const [url, want] of [
      ["/approvals", "/approvals"],
      ["https://evil.example/x", "/"],
      ["//evil.example/x", "/"],
      ["javascript:alert(1)", "/"],
      [undefined, "/"],
    ] as const) {
      const w = load();
      await w.run("push", { data: { json: () => ({ title: "WARDEN", body: "b", url }) } });
      expect(w.shown[0]!.opts.data.url).toBe(want);
      await w.run("notificationclick", {
        notification: { close: () => undefined, data: { url } },
      });
      expect(w.opened[0]).toBe(want);
    }
  });
});
