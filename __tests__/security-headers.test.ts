// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long";
  process.env.OIDC_CLIENT_SECRET = "test-client-secret";
});
vi.mock("server-only", () => ({}));

const { default: proxy, config } = await import("@/proxy");
const { default: nextConfig } = await import("../next.config");

const get = (path: string) => proxy(new NextRequest(`http://localhost:4200${path}`));

function expectStrict(res: Response) {
  const csp = res.headers.get("content-security-policy") ?? "";
  const script = csp.split("; ").find((d) => d.startsWith("script-src")) ?? "";
  expect(script).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
  expect(script).toContain("'strict-dynamic'");
  expect(script).not.toContain("'unsafe-inline'");
  for (const d of ["object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'"])
    expect(csp).toContain(d);
  expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  expect(res.headers.get("strict-transport-security")).toMatch(/max-age=\d{8}/);
  expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
  expect(res.headers.get("cross-origin-opener-policy")).toBe("same-origin");
  expect(res.headers.get("permissions-policy")).toContain("camera=()");
}

describe("security headers", () => {
  it("puts a nonce CSP and the static headers on pages, including the sign-in redirect", async () => {
    expectStrict(await get("/en/login"));
    const redirect = await get("/en/overview");
    expect(redirect.status).toBe(307);
    expectStrict(redirect);
  });

  it("covers BFF and auth routes, which the proxy used to skip", async () => {
    expect(new RegExp(`^${config.matcher[0]}$`).test("/api/bff/agents")).toBe(true);
    expectStrict(await get("/api/health"));
  });

  it("uses a new nonce on every request", async () => {
    const a = (await get("/en/login")).headers.get("content-security-policy");
    const b = (await get("/en/login")).headers.get("content-security-policy");
    expect(a).not.toBe(b);
  });

  it("sends the static headers on every route, static assets too, and no X-Powered-By", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    const all = ((await nextConfig.headers?.()) ?? []).find((r) => r.source === "/:path*");
    const keys = all?.headers.map((h) => h.key.toLowerCase()) ?? [];
    for (const k of ["x-content-type-options", "strict-transport-security", "x-frame-options"])
      expect(keys).toContain(k);
  });
});
