// A tiny stand-in for manar-api so the request-count test needs no Keycloak, Postgres or Compose
// stack. Answers `/me`, `/audit/verify` and any list endpoint with an empty, well-formed page.
import { createServer } from "node:http";

const port = Number(process.env.MOCK_API_PORT ?? 4311);

// Endpoints that answer with a bare array rather than a page.
const ARRAYS = [
  "/install-keys",
  "/host-groups",
  "/org-units",
  "/host-approval-rules",
  "/secrets/access",
];
const NOT_AVAILABLE = ["/billing/usage", "/tenant/license"];

const streams = new Set();
const PENDING_APPROVAL = {
  id: "00000000-0000-4000-8000-000000000001",
  taskId: "00000000-0000-4000-8000-000000000002",
  agentId: "00000000-0000-4000-8000-000000000003",
  toolId: "t",
  actionId: "a",
  resource: "r",
  riskScore: 10,
  policyVersionId: null,
  status: "PENDING",
  requestedAt: "2026-11-05T00:00:00.000Z",
  expiresAt: "2099-01-01T00:00:00.000Z",
};

createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const path = url.pathname;
  if (process.env.MOCK_API_DOWN) {
    res.writeHead(503);
    return res.end();
  }
  // Test hook: push an audit event to every open stream, e.g. GET /__emit?type=approval.requested.
  if (path === "/__emit") {
    const frame = { eventType: url.searchParams.get("type"), data: {} };
    streams.forEach((s) => s.write(`event: audit-event\ndata: ${JSON.stringify(frame)}\n\n`));
    res.writeHead(204);
    return res.end();
  }
  let body = { items: [], nextCursor: null };
  if (path === "/me")
    body = {
      subject: "e2e-user",
      email: "e2e@example.test",
      displayName: "E2E",
      workspace: { id: "ws-e2e", name: "E2E", kind: process.env.MOCK_WORKSPACE_KIND ?? "COMPANY" },
      roles: ["TENANT_OWNER"],
    };
  else if (path === "/me/data-preferences") {
    const off = { improveManar: false, aiTraining: false };
    body = { ...off, org: null, effective: off, noticeDismissed: true };
  } else if (path === "/approvals" && url.searchParams.get("status") === "PENDING")
    body = { items: [PENDING_APPROVAL], nextCursor: null };
  else if (path === `/approvals/${PENDING_APPROVAL.id}`)
    body = {
      ...PENDING_APPROVAL,
      parameters: {},
      redactedKeyPaths: [],
      parameterDigest: "sha256:0",
      riskFactors: [],
      deterministicFactors: [],
      aiFactors: [],
      reasons: [],
    };
  else if (ARRAYS.includes(path)) body = [];
  else if (path === "/account/deletion") body = { scheduled: false };
  else if (path === "/me/contact-email")
    body = { email: "e2e@example.test", verified: true, needsEmail: false, pending: false };
  else if (path === "/workspaces/auto-join") body = { offer: null };
  else if (path === "/ai-tools") body = { devices: [] };
  else if (path === "/sessions") body = { sessions: [], nextBefore: null };
  else if (path === "/audit/verify")
    body = { valid: true, eventCount: 0, brokenAt: null, verifiedAt: new Date().toISOString() };
  else if (path.startsWith("/events/live")) {
    if (process.env.MOCK_EVENTS_LIVE === "403") {
      // A role without audit access: the stream is refused and the console must poll instead.
      res.writeHead(403, { "content-type": "application/json" });
      return res.end("{}");
    }
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store" });
    res.write(": ok\n\n");
    streams.add(res);
    res.on("close", () => streams.delete(res));
    return; // held open, like the real stream
  }
  // Shell widgets whose real payloads are not worth faking: "not available" renders nothing.
  if (NOT_AVAILABLE.includes(path)) {
    res.writeHead(404, { "content-type": "application/json" });
    return res.end("{}");
  }
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}).listen(port, "127.0.0.1");
