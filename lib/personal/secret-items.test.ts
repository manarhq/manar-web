import { describe, expect, it } from "vitest";

import { toSecretItems } from "@/lib/personal/secret-items";
import type { SecretEvent } from "@/hooks/use-secrets";

const ev = (o: Partial<SecretEvent>): SecretEvent => ({
  id: "e1",
  hostId: "h",
  hostname: "laptop",
  type: "secret.touched",
  toolId: "host.cursor",
  process: "node",
  pathClass: "aws",
  maskedPath: "~/.aws/credentials",
  blocked: false,
  at: "2026-11-01T10:00:00Z",
  ...o,
});

describe("toSecretItems", () => {
  it("maps blocked and seen touches, names the tool, keeps the masked path", () => {
    const items = toSecretItems([ev({ blocked: true }), ev({ id: "e2" })]);
    expect(items.map((i) => i.state)).toEqual(["blocked", "allowed"]);
    expect(items[0]).toMatchObject({ tool: "Cursor", maskedPath: "~/.aws/credentials" });
  });

  it("shows programs waiting for a vaulted secret first and ignores non-touch events", () => {
    const items = toSecretItems(
      [ev({ type: "secret.vault.denied" }), ev({ id: "e3" })],
      [
        {
          id: "a1",
          hostId: "h",
          kind: "aws",
          ref: "default",
          program: "terraform",
          createdAt: "2026-11-01T10:01:00Z",
        },
      ],
    );
    expect(items.map((i) => i.state)).toEqual(["waiting", "allowed"]);
    expect(items[0]!.tool).toBe("terraform");
  });
});
