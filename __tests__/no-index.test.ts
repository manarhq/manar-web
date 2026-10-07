import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("console is never indexed", () => {
  it("sends X-Robots-Tag noindex on every route", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const all = rules.find((rule) => rule.source === "/:path*");
    expect(all?.headers).toContainEqual({
      key: "X-Robots-Tag",
      value: "noindex, nofollow, noarchive",
    });
  });
});
