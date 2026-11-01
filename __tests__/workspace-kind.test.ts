import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  NODE_ENV: "test",
  MANAR_WORKSPACE_KIND_OVERRIDE: undefined as string | undefined,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ env }));

import { resolveWorkspaceKind, usesPersonalShell } from "@/lib/workspace-kind";

beforeEach(() => {
  env.NODE_ENV = "test";
  env.MANAR_WORKSPACE_KIND_OVERRIDE = undefined;
});

describe("workspace kind picks the shell", () => {
  it("defaults to the console until the session carries a kind", () => {
    expect(resolveWorkspaceKind(null)).toBe("COMPANY");
    expect(resolveWorkspaceKind({})).toBe("COMPANY");
    expect(usesPersonalShell("COMPANY")).toBe(false);
  });

  it("personal and sample workspaces get the personal shell", () => {
    expect(usesPersonalShell(resolveWorkspaceKind({ workspaceKind: "PERSONAL" }))).toBe(true);
    expect(usesPersonalShell(resolveWorkspaceKind({ workspaceKind: "SAMPLE" }))).toBe(true);
  });

  it("the preview override works outside production and is ignored in production", () => {
    env.MANAR_WORKSPACE_KIND_OVERRIDE = "PERSONAL";
    expect(resolveWorkspaceKind({ workspaceKind: "COMPANY" })).toBe("PERSONAL");
    env.NODE_ENV = "production";
    expect(resolveWorkspaceKind({ workspaceKind: "COMPANY" })).toBe("COMPANY");
  });
});
