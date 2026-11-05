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
const NOT_AVAILABLE = [
  "/billing/usage",
  "/account/deletion",
  "/me/contact-email",
  "/workspaces/auto-join",
  "/tenant/license",
];

createServer((req, res) => {
  const path = new URL(req.url, "http://x").pathname;
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
  } else if (ARRAYS.includes(path)) body = [];
  else if (path === "/ai-tools") body = { devices: [] };
  else if (path === "/sessions") body = { sessions: [], nextBefore: null };
  else if (path === "/audit/verify")
    body = { valid: true, eventCount: 0, brokenAt: null, verifiedAt: new Date().toISOString() };
  else if (path.startsWith("/events/live")) {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store" });
    res.write(": ok\n\n");
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
