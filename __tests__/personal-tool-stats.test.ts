import { describe, expect, it } from "vitest";

import { HOST_UNKNOWN, summarizeTools, toolDisplayName } from "@/lib/personal/tool-stats";

describe("summarizeTools", () => {
  it("counts allowed and blocked from audit and waiting from pending approvals only", () => {
    const stats = summarizeTools(
      [
        { toolId: "host.cursor", decision: "ALLOW" },
        { toolId: "host.cursor", decision: "ALLOW" },
        { toolId: "host.cursor", decision: "APPROVAL_REQUIRED" },
        { toolId: "host.codex-cli", decision: "DENY" },
        { decision: "ALLOW" },
      ],
      [{ toolId: "host.cursor" }],
    );
    expect(stats.get(HOST_UNKNOWN)).toEqual([
      { toolId: "host.codex-cli", allowed: 0, waiting: 0, blocked: 1 },
      { toolId: "host.cursor", allowed: 2, waiting: 1, blocked: 0 },
    ]);
  });

  it("groups by data.hostId when the event carries one", () => {
    const stats = summarizeTools(
      [{ toolId: "host.cursor", decision: "ALLOW", data: { hostId: "h1" } }],
      [],
    );
    expect([...stats.keys()]).toEqual(["h1"]);
  });

  it("falls back to the raw id for unknown tools", () => {
    expect(toolDisplayName("host.cursor")).toBe("Cursor");
    expect(toolDisplayName("host.new-thing")).toBe("host.new-thing");
  });
});
