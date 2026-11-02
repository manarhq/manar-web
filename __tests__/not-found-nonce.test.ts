import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isHTTPAccessFallbackError } from "next/dist/client/components/http-access-fallback/http-access-fallback";

import CatchAllNotFound from "@/app/[locale]/[...rest]/page";

/**
 * Unmatched paths must 404 from a per-request render under the locale layout. Next's own
 * `_not-found` page is prerendered at build time, so its scripts carry no CSP nonce and the
 * nonce + 'strict-dynamic' policy from proxy.ts blocks every one of them.
 */
describe("not-found pages render per request (CSP nonce)", () => {
  it("routes every unmatched locale path to notFound()", () => {
    let thrown: unknown;
    try {
      CatchAllNotFound();
    } catch (error) {
      thrown = error;
    }
    expect(isHTTPAccessFallbackError(thrown)).toBe(true);
    expect((thrown as { digest: string }).digest).toMatch(/;404$/);
  });

  it("has the localized 404 text in both locales", () => {
    for (const locale of ["en", "ar"]) {
      const messages = JSON.parse(readFileSync(`messages/${locale}/errors.json`, "utf8"));
      expect(Object.keys(messages.notFound).sort()).toEqual(["body", "home", "title"]);
    }
  });
});
