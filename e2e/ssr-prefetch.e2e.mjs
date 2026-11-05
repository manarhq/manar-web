/**
 * Server-rendered data: the first HTML of a page already carries the data the shell and the page
 * read (dehydrated TanStack Query state), so first paint needs no spinner and no waterfall. Also
 * checks it fails soft when manar-api is down.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { sessionCookies, startStack } from "./harness.mjs";

const APPROVAL_ID = "00000000-0000-4000-8000-000000000001"; // the mock's one PENDING approval
let stack;
let cookie;

before(async () => {
  stack = await startStack({ appPort: 4350, apiPort: 4351 });
  cookie = (await sessionCookies(stack.base, "COMPANY"))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
});
after(async () => stack?.stop());

async function html(path, cookieHeader = cookie) {
  const r = await fetch(`${stack.base}${path}`, { headers: { cookie: cookieHeader } });
  assert.equal(r.status, 200, path);
  return r.text();
}

describe("first HTML carries the data", () => {
  it("every console page has the waiting approvals (shell prefetch)", async () => {
    for (const path of ["/en/approvals", "/en/overview"])
      assert.ok((await html(path)).includes(APPROVAL_ID), `${path} has no prefetched approval`);
  });

  it("personal Home has its devices and tool inventory in the cache", async () => {
    const personal = (await sessionCookies(stack.base, "PERSONAL"))
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    const page = await html("/en/home", personal);
    assert.ok(page.includes(String.raw`\"hosts\",\"list\"`), "no prefetched hosts list");
    assert.ok(page.includes(String.raw`[\"ai-tools\"]`), "no prefetched ai-tools");
  });

  it("a page still renders when the data cannot be prefetched (no session token to use)", async () => {
    const page = await html("/en/approvals"); // sanity: with data
    assert.ok(page.length > 1000);
    const slow = await startStack({
      appPort: 4352,
      apiPort: 4353,
      mockEnv: { MOCK_API_DOWN: "1" },
    });
    try {
      const c = (await sessionCookies(slow.base, "COMPANY"))
        .map((x) => `${x.name}=${x.value}`)
        .join("; ");
      const r = await fetch(`${slow.base}/en/approvals`, { headers: { cookie: c } });
      assert.equal(r.status, 200);
      assert.ok(!(await r.text()).includes(APPROVAL_ID));
    } finally {
      await slow.stop();
    }
  });
});
