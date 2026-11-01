import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Runs the real public/sw.js against a fake worker scope and checks what it will open.
function load(opts: { lang?: string; status?: number } = {}) {
  const fetched: { url: string; init: { body: string; credentials: string } }[] = [];
  const listeners: string[] = [];
  const open: { title: string; opts: Record<string, unknown>; closed: boolean }[] = [];
  const handlers: Record<string, (e: unknown) => void> = {};
  const shown: { title: string; opts: Record<string, unknown> & { data: { url: string } } }[] = [];
  const opened: string[] = [];
  const self = {
    location: { origin: "https://console.example" },
    navigator: { language: opts.lang ?? "en-US" },
    addEventListener: (n: string, h: (e: unknown) => void) => (
      (handlers[n] = h),
      listeners.push(n)
    ),
    skipWaiting: () => undefined,
    clients: {
      claim: () => Promise.resolve(),
      matchAll: () => Promise.resolve([]),
      openWindow: (u: string) => (opened.push(u), Promise.resolve()),
    },
    registration: {
      showNotification: (title: string, o: Record<string, unknown> & { data: { url: string } }) => {
        shown.push({ title, opts: o });
        open.push({ title, opts: o, closed: false });
        return Promise.resolve();
      },
      getNotifications: (f?: { tag?: string }) =>
        Promise.resolve(
          open
            .filter((n) => !n.closed && (!f?.tag || n.opts.tag === f.tag))
            .map((n) => ({
              data: n.opts.data,
              close: () => {
                n.closed = true;
              },
            })),
        ),
    },
  };
  const fakeFetch = (url: string, init: { body: string; credentials: string }) => {
    fetched.push({ url, init });
    return Promise.resolve({ ok: (opts.status ?? 200) < 300, status: opts.status ?? 200 });
  };
  new Function("self", "fetch", "setTimeout", readFileSync("public/sw.js", "utf8"))(
    self,
    fakeFetch,
    (fn: () => void) => fn(),
  );
  const run = (name: string, e: Record<string, unknown>) => {
    let p: Promise<unknown> | undefined;
    handlers[name]!({ ...e, waitUntil: (x: Promise<unknown>) => (p = x) });
    return p;
  };
  return { run, shown, opened, fetched, listeners, open };
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

  it("never caches: no fetch handler and no Cache API", () => {
    const src = readFileSync("public/sw.js", "utf8");
    expect(load().listeners).not.toContain("fetch");
    expect(src).not.toMatch(/\bcaches\b|CacheStorage|\.put\(|\.addAll\(/);
  });

  const live = () => ({
    kind: "approval",
    title: "WARDEN",
    body: "Cursor is waiting for your decision",
    url: "/approvals",
    tag: "approval-host-h1",
    approvalId: "a1",
    expiresAt: Date.now() + 60_000,
    action: "tok.sig",
  });
  const click = (w: ReturnType<typeof load>, action: string, data: Record<string, unknown>) =>
    w.run("notificationclick", { action, notification: { close: () => undefined, data } });

  it("shows Approve once and Deny only while the approval is live", async () => {
    const w = load();
    await w.run("push", { data: { json: () => live() } });
    expect((w.shown[0]!.opts.actions as { action: string }[]).map((a) => a.action)).toEqual([
      "approve_once",
      "deny",
    ]);
    const w2 = load({ lang: "ar-AE" });
    await w2.run("push", { data: { json: () => ({ ...live(), expiresAt: Date.now() - 1 }) } });
    expect(w2.shown[0]!.opts.actions).toBeUndefined();
    const w3 = load({ lang: "ar-AE" });
    await w3.run("push", { data: { json: () => live() } });
    expect((w3.shown[0]!.opts.actions as { title: string }[])[1]!.title).toBe("رفض");
  });

  it("posts the button press to the BFF with the token, same origin", async () => {
    const w = load();
    await click(w, "approve_once", {
      url: "/approvals",
      action: "tok.sig",
      expiresAt: Date.now() + 5000,
    });
    expect(w.fetched).toHaveLength(1);
    expect(w.fetched[0]!.url).toBe("/api/bff/phone/push-decide");
    expect(w.fetched[0]!.init.credentials).toBe("same-origin");
    expect(JSON.parse(w.fetched[0]!.init.body)).toEqual({
      token: "tok.sig",
      decision: "approve_once",
    });
    expect(w.shown.at(-1)!.opts.body).toBe("Approved once.");
  });

  it("does not call the server after expiry, opens the console when signed out, reports a refusal", async () => {
    const w = load();
    await click(w, "deny", { url: "/approvals", action: "t", expiresAt: Date.now() - 1 });
    expect(w.fetched).toHaveLength(0);
    expect(String(w.shown.at(-1)!.opts.body)).toMatch(/timed out/);
    const out = load({ status: 401 });
    await click(out, "deny", { url: "/approvals", action: "t", expiresAt: Date.now() + 5000 });
    expect(out.opened).toEqual(["/approvals"]);
    const bad = load({ status: 403 });
    await click(bad, "deny", { url: "/approvals", action: "t", expiresAt: Date.now() + 5000 });
    expect(String(bad.shown.at(-1)!.opts.body)).toMatch(/Could not/);
  });

  it("a plain click or a button without a token just opens the console", async () => {
    const w = load();
    await click(w, "approve_once", { url: "/approvals" });
    await click(w, "", { url: "/approvals", action: "t" });
    expect(w.fetched).toHaveLength(0);
    expect(w.opened).toEqual(["/approvals", "/approvals"]);
  });

  it("removes the notification when the approval is closed", async () => {
    const w = load();
    await w.run("push", { data: { json: () => live() } });
    await w.run("push", { data: { json: () => ({ kind: "approval_closed", approvalId: "a1" }) } });
    expect(w.open.filter((n) => !n.closed)).toHaveLength(0);
  });
});
