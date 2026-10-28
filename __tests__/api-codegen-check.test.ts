import path from "node:path";
import { describe, expect, it } from "vitest";

import { formatGenerated, matchesGenerated } from "../scripts/format-generated.mjs";

const file = path.join(__dirname, "..", "lib", "api", "schema.d.ts");
const raw = `export interface paths {\n    "/a": {\n        get: never;\n    };\n}\n`;

describe("api:codegen:check formatting", () => {
  it("formats generated output with the repo config", async () => {
    expect(await formatGenerated(raw, file)).toContain('\n  "/a": {\n    get: never;\n  };');
  });

  it("passes a correctly formatted committed file against raw generation", async () => {
    const committed = await formatGenerated(raw, file);
    expect(committed).not.toBe(raw);
    expect(await matchesGenerated(committed, raw, file)).toBe(true);
  });

  it("still fails on real drift", async () => {
    const committed = await formatGenerated(raw, file);
    const drifted = raw.replace('"/a"', '"/b"');
    expect(await matchesGenerated(committed, drifted, file)).toBe(false);
  });
});
