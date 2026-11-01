// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long";
  process.env.OIDC_ISSUER = "http://kc.test/realms/manar";
  process.env.OIDC_CLIENT_SECRET = "test-client-secret";
});
vi.mock("server-only", () => ({}));

const ISSUER = "http://kc.test/realms/manar";

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        issuer: ISSUER,
        authorization_endpoint: `${ISSUER}/auth`,
        token_endpoint: `${ISSUER}/token`,
        jwks_uri: `${ISSUER}/certs`,
      }),
    ),
  );
});

async function login(method: string) {
  const { POST } = await import("@/app/api/auth/login/route");
  const body = new URLSearchParams({ method, locale: "en" });
  return POST(new NextRequest("http://localhost:3100/api/auth/login", { method: "POST", body }));
}

describe("sign-in without a workspace ID", () => {
  it.each([
    ["microsoft", "microsoft"],
    ["github", "github"],
  ])("%s goes straight to the shared realm with kc_idp_hint=%s", async (method, hint) => {
    const location = new URL((await login(method)).headers.get("location") ?? "");
    expect(location.origin + location.pathname).toBe(`${ISSUER}/auth`);
    expect(location.searchParams.get("kc_idp_hint")).toBe(hint);
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("email uses the realm's own email-link form (no hint)", async () => {
    const location = new URL((await login("email")).headers.get("location") ?? "");
    expect(location.searchParams.has("kc_idp_hint")).toBe(false);
  });

  it("refuses an unknown method instead of passing it to Keycloak", async () => {
    const location = (await login("../../evil")).headers.get("location") ?? "";
    expect(location).toContain("/en/login");
    expect(location).toContain("error=callbackFailed");
  });
});

describe("choosing the active workspace", () => {
  const w = (over: object) => ({
    tenantId: "t",
    name: "n",
    kind: "PERSONAL",
    status: "ACTIVE",
    membershipStatus: "ACTIVE",
    roles: [],
    ...over,
  });

  it("only ever picks from the caller's own ready workspaces", async () => {
    const { chooseWorkspace } = await import("@/lib/auth/workspace.server");
    const items = [
      w({ tenantId: "company", kind: "COMPANY", membershipStatus: "PENDING" }),
      w({ tenantId: "mine" }),
    ];
    // A preferred id that is only a pending request, or not in the list at all, is not honoured.
    expect(chooseWorkspace(items as never, "company")).toMatchObject({ workspaceId: "mine" });
    expect(chooseWorkspace(items as never, "not-mine")).toMatchObject({ workspaceId: "mine" });
  });

  it("honours a ready preferred workspace, and never defaults to a sample", async () => {
    const { chooseWorkspace } = await import("@/lib/auth/workspace.server");
    const items = [
      w({ tenantId: "mine" }),
      w({ tenantId: "co", kind: "COMPANY" }),
      w({ tenantId: "s", kind: "SAMPLE" }),
    ];
    expect(chooseWorkspace(items as never, "co")).toMatchObject({
      workspaceId: "co",
      workspaceKind: "COMPANY",
    });
    expect(chooseWorkspace([items[2]] as never)).toEqual({ state: "none" });
  });

  it("reports setting up while the personal workspace is queued", async () => {
    const { chooseWorkspace } = await import("@/lib/auth/workspace.server");
    expect(chooseWorkspace([w({ status: "QUEUED" })] as never)).toEqual({ state: "setting-up" });
    expect(chooseWorkspace([] as never)).toEqual({ state: "none" });
  });
});
