// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long";
  process.env.OIDC_ISSUER = "http://kc.test/realms/manar";
  process.env.OIDC_CLIENT_ID = "manar-web";
  process.env.OIDC_CLIENT_SECRET = "test-client-secret";
  process.env.APP_BASE_URL = "http://localhost:3100";
  process.env.MANAR_API_BASE_URL = "http://api.test";
});
vi.mock("server-only", () => ({}));

import { decryptSession, encryptSession } from "@/lib/auth/session";

const base = {
  issuer: "http://kc.test/realms/manar",
  subject: "u1",
  accessToken: "a",
  accessTokenExpiresAt: 0,
};

afterEach(() => vi.useRealTimers());

describe("the 12-hour session cap is absolute", () => {
  it("re-encrypting on refresh keeps the original sign-in time, so the session still ends at 12 h", async () => {
    vi.useFakeTimers({ now: Date.parse("2026-11-03T00:00:00Z") });
    const first = await decryptSession(await encryptSession(base));
    expect(first?.startedAt).toBe(Date.parse("2026-11-03T00:00:00Z"));

    // 11 hours later a refresh writes the cookie again.
    vi.setSystemTime(Date.parse("2026-11-03T11:00:00Z"));
    const refreshed = await encryptSession({ ...first!, accessToken: "b" });
    expect((await decryptSession(refreshed))?.startedAt).toBe(first!.startedAt);

    // 12 hours and a minute after sign-in it is gone, refresh or not.
    vi.setSystemTime(Date.parse("2026-11-03T12:01:00Z"));
    expect(await decryptSession(refreshed)).toBeNull();
  });
});
