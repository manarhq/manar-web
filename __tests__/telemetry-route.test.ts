// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long";
  process.env.OIDC_ISSUER = "http://kc.test/realms/manar";
  process.env.OIDC_CLIENT_ID = "manar-web";
  process.env.OIDC_CLIENT_SECRET = "test-client-secret";
  process.env.MANAR_API_BASE_URL = "http://api.test";
});
vi.mock("server-only", () => ({}));
const session = vi.hoisted(() => ({ value: null as unknown }));
vi.mock("@/lib/auth/session.server", () => ({ getSession: async () => session.value }));

import { POST } from "@/app/api/bff/telemetry/events/route";

const body = JSON.stringify({
  events: [{ name: "page_view", at: "2026-11-02T00:00:00Z", props: {} }],
});
const req = (b = body) =>
  new NextRequest("http://app.test/api/bff/telemetry/events", {
    method: "POST",
    headers: { "sec-fetch-site": "same-origin", "content-type": "application/json" },
    body: b,
  });

describe("POST /api/bff/telemetry/events", () => {
  const upstream = vi.fn();
  beforeEach(() => {
    upstream.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", upstream);
    session.value = {
      accessToken: "tok-123",
      accessTokenExpiresAt: Date.now() + 600_000,
      workspaceId: "ws-1",
    };
  });

  it("forwards the bearer token and workspace to manar-api and returns 204", async () => {
    const res = await POST(req());
    expect(res.status).toBe(204);
    const [url, init] = upstream.mock.calls[0];
    expect(String(url)).toBe("http://api.test/telemetry/events");
    expect(init.headers.Authorization).toBe("Bearer tok-123");
    expect(init.headers["X-Manar-Workspace"]).toBe("ws-1");
    expect(init.body).toBe(body);
  });

  it("returns 204 and forwards nothing without a session", async () => {
    session.value = null;
    expect((await POST(req())).status).toBe(204);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("returns 204 even when manar-api is down", async () => {
    upstream.mockRejectedValue(new Error("down"));
    expect((await POST(req())).status).toBe(204);
  });

  it("does not read the body when there is no session", async () => {
    session.value = null;
    const r = req();
    const text = vi.spyOn(r, "text");
    expect((await POST(r)).status).toBe(204);
    expect(r.bodyUsed).toBe(false);
    expect(text).not.toHaveBeenCalled();
  });

  it("rejects a declared Content-Length over the cap without forwarding", async () => {
    const r = new NextRequest("http://app.test/api/bff/telemetry/events", {
      method: "POST",
      headers: { "sec-fetch-site": "same-origin", "content-length": String(70 * 1024) },
      body,
    });
    expect((await POST(r)).status).toBe(204);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("counts bytes, not characters, and aborts past the cap", async () => {
    // 40k two-byte characters: 40k string length, 80k bytes.
    const big = JSON.stringify({
      events: [{ name: "page_view", props: { a: "é".repeat(40_000) } }],
    });
    expect((await POST(req(big))).status).toBe(204);
    expect(upstream).not.toHaveBeenCalled();
  });
});
