// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long";
  process.env.OIDC_ISSUER = "http://kc.test/realms/manar";
  process.env.OIDC_CLIENT_ID = "manar-web";
  process.env.OIDC_CLIENT_SECRET = "test-client-secret";
  process.env.APP_BASE_URL = "http://localhost:3100";
  process.env.MANAR_API_BASE_URL = "http://api.test";
});
vi.mock("server-only", () => ({}));

const post = (path: string, site: string) =>
  new NextRequest(`http://localhost:3100${path}`, {
    method: "POST",
    headers: { "sec-fetch-site": site, "content-type": "application/x-www-form-urlencoded" },
    body: "locale=en",
  });

describe("sign-in and sign-out refuse other sites", () => {
  it.each(["logout", "login"])("%s: cross-site POST is refused", async (route) => {
    const { POST } = await import(`@/app/api/auth/${route}/route`);
    expect((await POST(post(`/api/auth/${route}`, "cross-site"))).status).toBe(403);
  });

  it("logout from the console itself still signs out", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");
    const res = await POST(post("/api/auth/logout", "same-origin"));
    expect(res.status).toBe(303);
  });
});
