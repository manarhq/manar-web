// A stand-in for manar-api for the friction flows (rule offer, learning, friction page). It keeps
// a little state and records the writes it receives at GET /__calls, so the browser test can
// assert what the console actually sent. No Keycloak, Postgres or Compose stack.
import { createServer } from "node:http";

const port = Number(process.env.MOCK_API_PORT ?? 4321);
const calls = [];
const grants = [
  {
    id: "g1",
    origin: "offer",
    hostId: "h1",
    hostName: "sara-laptop",
    toolId: "host.cursor",
    actionId: "edit",
    scope: "/home/sara/proj/src/*",
    createdAt: "2026-11-05T10:00:00Z",
    expiresAt: "2027-11-05T10:00:00Z",
    useCount: 2,
  },
  {
    id: "g2",
    origin: "learning",
    hostId: "h1",
    hostName: "sara-laptop",
    toolId: "host.cursor",
    actionId: "mcp",
    scope: "github/create_issue",
    createdAt: "2026-11-05T10:00:00Z",
    expiresAt: "2027-11-05T10:00:00Z",
    useCount: 0,
  },
];
let suggestions = [
  {
    id: "s1",
    hostId: "h1",
    hostname: "sara-laptop",
    toolId: "host.cursor",
    actionId: "edit",
    scope: "/home/sara/docs/*",
    count: 9,
    lastSeenAt: "2026-11-05T10:00:00Z",
    lastsDays: 365,
  },
];
let learningEnabled = true;

const nums = (p, extra = {}) => ({
  prompts: p,
  approvals: p,
  denies: 0,
  expired: 0,
  deniedLaterApproved: 0,
  answered: p,
  avgAnswerSeconds: 6.5,
  blockedMinutes: 0.4,
  ...extra,
});
const today = new Date();
const series = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (6 - i)),
  );
  return { day: d.toISOString().slice(0, 10), ...nums(i + 1, i === 6 ? { expired: 2 } : {}) };
});

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

createServer((req, res) => {
  const path = new URL(req.url, "http://x").pathname;
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    if (path === "/__calls") return json(res, 200, calls);
    if (req.method !== "GET")
      calls.push({ method: req.method, path, body: raw ? JSON.parse(raw) : null });
    if (path === "/me")
      return json(res, 200, {
        subject: "e2e-user",
        email: "e2e@example.test",
        displayName: "E2E",
        workspace: {
          id: "ws-e2e",
          name: "E2E",
          kind: process.env.MOCK_WORKSPACE_KIND ?? "COMPANY",
        },
        roles: ["TENANT_OWNER"],
      });
    if (path === "/me/data-preferences") {
      const off = { improveManar: false, aiTraining: false };
      return json(res, 200, { ...off, org: null, effective: off, noticeDismissed: true });
    }
    if (path === "/host-approvals")
      return json(res, 200, {
        items: [
          {
            id: "a1",
            hostId: "h1",
            hostName: "sara-laptop",
            ownerName: "Sara",
            toolId: "host.cursor",
            actionId: "edit",
            resource: "/home/sara/proj/src/new.ts",
            summary: "",
            highRisk: false,
            ruleOffer: { scope: "/home/sara/proj/src/*", approvals: 3, lastsDays: 365 },
            expiresAt: new Date(Date.now() + 600_000).toISOString(),
            createdAt: new Date().toISOString(),
            allowedDecisions: ["approve_once", "approve_8h", "deny"],
          },
        ],
      });
    if (path === "/approvals/allow-grants") return json(res, 200, { items: grants });
    const revoke = /^\/approvals\/allow-grants\/([\w-]+)\/revoke$/.exec(path);
    if (revoke && req.method === "POST") {
      const i = grants.findIndex((g) => g.id === revoke[1]);
      if (i >= 0) grants.splice(i, 1);
      return json(res, 200, { id: revoke[1] });
    }
    if (path === "/host-approvals/a1/decide")
      return json(res, 200, { status: "APPROVED", decision: "approve_once" });
    if (path === "/workspace/start-mode")
      return json(res, 200, {
        mode: "ask",
        learning: { enabled: learningEnabled, days: 7, source: "default" },
      });
    if (path === "/workspace/learning")
      return json(res, 200, {
        learning: { enabled: learningEnabled, days: 7, source: "default" },
        totalWouldHaveAsked: 12,
        devices: [
          {
            hostId: "h1",
            hostname: "sara-laptop",
            learning: { active: true, endsAt: "2026-11-10T10:00:00Z", off: false },
            wouldHaveAsked: 12,
          },
        ],
        suggestions,
      });
    const accept = /^\/workspace\/learning\/suggestions\/([\w-]+)\/(accept|dismiss)$/.exec(path);
    if (accept && req.method === "POST") {
      suggestions = suggestions.filter((s) => s.id !== accept[1]);
      return json(res, 200, { id: accept[1] });
    }
    if (path === "/friction")
      return json(res, 200, {
        scope: "workspace",
        days: 7,
        budget: 5,
        developers: 2,
        avgPromptsPerDeveloperPerDay: 2,
        overBudget: false,
        totals: nums(28, { expired: 2, deniedLaterApproved: 1 }),
        series,
        people: [{ name: "Sara", me: true, ...nums(20) }],
      });
    if (path === "/ai-tools") return json(res, 200, { devices: [] });
    if (path === "/audit/verify")
      return json(res, 200, {
        valid: true,
        eventCount: 0,
        brokenAt: null,
        verifiedAt: new Date().toISOString(),
      });
    if (path.startsWith("/events/live")) {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store" });
      res.write(": ok\n\n");
      return;
    }
    if (["/billing/usage", "/tenant/license"].includes(path)) return json(res, 404, {});
    if (
      [
        "/install-keys",
        "/host-groups",
        "/org-units",
        "/host-approval-rules",
        "/secrets/access",
      ].includes(path)
    )
      return json(res, 200, []);
    return json(res, 200, { items: [], nextCursor: null });
  });
}).listen(port, "127.0.0.1");
