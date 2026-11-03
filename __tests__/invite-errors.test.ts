import { describe, expect, it } from "vitest";

import ar from "@/messages/ar/growth.json";
import en from "@/messages/en/growth.json";
import { errorKey } from "@/components/manar/growth/team-settings-view";

describe("invite errors", () => {
  it("shows a rate-limit message for 429 and the open-invites cap, in both languages", () => {
    expect(errorKey({ statusCode: 429, message: "ThrottlerException: Too Many Requests" })).toBe(
      "too_many",
    );
    expect(errorKey({ statusCode: 409, message: "too_many_open_invites" })).toBe(
      "too_many_open_invites",
    );
    expect(errorKey({ statusCode: 500, message: "boom" })).toBe("generic");
    for (const key of ["too_many", "too_many_open_invites"] as const) {
      expect(en.team.errors[key]).toBeTruthy();
      expect(ar.team.errors[key]).toBeTruthy();
    }
  });
});
