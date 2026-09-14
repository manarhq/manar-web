/**
 * GENERATED FILE — do not hand-edit.
 *
 * Produced by `pnpm api:codegen` (scripts/generate-api-client.mjs) from
 * manar-api's live OpenAPI document at /api/v1/docs-json.
 * Regenerate instead of patching: `pnpm api:codegen`. CI/build fails via
 * `pnpm api:codegen:check` if this drifts from a fresh regeneration.
 */
export interface paths {
  "/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["AppController_getHello"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/health/live": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["HealthController_live"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/health/ready": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["HealthController_ready"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/agents": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List agents
     * @description Cursor-paginated, newest first. Optional `status` filter. See src/common/pagination/cursor-pagination.ts for the pagination convention.
     */
    get: operations["AgentsController_listAgents"];
    put?: never;
    /**
     * Create an agent record
     * @description Creates the Agent row in `PENDING_ENROLLMENT` status. Does not itself issue an enrollment token — call `POST /agents/:id/enrollment-tokens` next. Requires SECURITY_ADMIN or TENANT_OWNER. Supports an `Idempotency-Key` header (Phase 12a, Section 8) — a replay with the same key returns the original response without creating a second Agent row.
     */
    post: operations["AgentsController_createAgent"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/agents/{id}/enrollment-tokens": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Issue a one-time enrollment token for an agent
     * @description The raw token is returned exactly once and is never retrievable again. Give it to the agent process out-of-band so it can complete `POST /agents/enroll`.
     */
    post: operations["AgentsController_createEnrollmentToken"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/agents/{id}/revoke": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Revoke an agent
     * @description Revokes the agent (its certificates stop being accepted by `AgentMtlsGuard`). Idempotent status response.
     */
    post: operations["AgentsController_revokeAgent"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/agents/enroll": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["AgentEnrollController_enroll"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/tasks": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List tasks
     * @description Cursor-paginated, newest first. Optional `status` and `assignedAgentId` filters.
     */
    get: operations["TasksController_listTasks"];
    put?: never;
    /**
     * Create a root task
     * @description Assigns an agent a narrowly-scoped grant of authority. A root task has no parent — every delegation chain starts here (see `POST /agent/v1/tasks/:id/delegate`, out of scope for this human-facing doc). Requires SECURITY_ADMIN, TENANT_OWNER, or AI_GOVERNANCE_MANAGER.
     */
    post: operations["TasksController_createTask"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/tasks/{id}/revoke": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Revoke a task
     * @description Immediately invalidates this task and every descendant (delegated) task's authorization, enforced by AuthorizationService walking the live ancestor chain on every check — not by a cascading write to descendants.
     */
    post: operations["TasksController_revokeTask"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/policies": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List policies
     * @description Cursor-paginated, newest first. Each row includes its current PUBLISHED version, exactly like GET /policies/:id.
     */
    get: operations["PolicyController_listPolicies"];
    put?: never;
    /**
     * Create a policy (with its first DRAFT version)
     * @description Provide exactly one of `content` (JSON) or `contentYaml` (YAML) — both validate against the same PolicyContentSchema.
     */
    post: operations["PolicyController_createPolicy"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/policies/{id}/versions": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** List every version of a policy */
    get: operations["PolicyController_listVersions"];
    put?: never;
    /**
     * Create a new DRAFT version of a policy
     * @description Provide exactly one of `content`, `contentYaml`, or `rollbackToVersionId`. There is no update/delete endpoint for a published version — published versions are immutable; editing always means creating a new DRAFT here.
     */
    post: operations["PolicyController_createVersion"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/policies/suggest": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * AI-assisted policy draft (Phase 10c)
     * @description Calls manar-ai's SuggestPolicy RPC and, when it returns a usable draft, persists it as a new DRAFT PolicyVersion under an existing policy (policyId) or a brand-new one (policyName) -- exactly one of the two must be provided. Never auto-published: the normal POST /policies/:id/versions/:versionId/publish call is still required. `available: false` means manar-ai was unreachable/returned no usable draft -- nothing is created in that case.
     */
    post: operations["PolicyController_suggestPolicy"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/policies/{id}/versions/{versionId}/publish": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Publish a DRAFT policy version
     * @description Narrower than the other endpoints on this controller: requires SECURITY_ADMIN or TENANT_OWNER only (no AI_GOVERNANCE_MANAGER). The version must currently be DRAFT. Supports an `Idempotency-Key` header (Phase 12a, Section 8) — a replay with the same key returns the original response without re-publishing.
     */
    post: operations["PolicyController_publishVersion"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/policies/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get a policy and its current published version */
    get: operations["PolicyController_getPolicy"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/policies/{id}/versions/{versionId}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Get one policy version
     * @description With `?format=yaml`, returns the content as a `text/yaml` document instead of the normal JSON envelope.
     */
    get: operations["PolicyController_getVersion"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/approvals": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List approval requests
     * @description Cursor-paginated, newest first (by requestedAt). Optional `status` filter — an operator queue view is typically `?status=PENDING`.
     */
    get: operations["ApprovalsController_list"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/approvals/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * The exact action under review (release 2026-11-11)
     * @description The immutable, safely redacted snapshot a reviewer needs before approving: the invocation parameters, the parameterDigest an issued grant is bound to, the risk breakdown with deterministic factors and AI signals SEPARATELY attributed, why approval was required, the policy version, expiry, and what the action actually does. Redaction is key-name based, not content-based DLP -- redactedKeyPaths names every withheld value so a partial object is never read as a complete one. Reachable only on the human JWT surface; an agent uses the separate mTLS listener.
     */
    get: operations["ApprovalsController_getOne"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/approvals/{id}/decide": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Record a human decision on a pending approval request
     * @description Signals the already-running ApprovalWorkflow with the decision, then synchronously awaits the workflow's actual resolved outcome (Phase 14 security cleanup — see this handler's doc comment for why) before responding. The returned `status`/`decision` are the real, final outcome — for two genuinely concurrent decide calls on the same request, both responses report the one decision the workflow's first-signal-wins handler actually acted on, never a discarded one. Requires APPROVER, SECURITY_ADMIN, or TENANT_OWNER.
     */
    post: operations["ApprovalsController_decide"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/audit": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Search/browse audit events
     * @description Queries the OpenSearch-indexed, search-optimized copy of the tamper-evident audit chain (Section 45) — never Postgres directly. Cursor-paginated, newest first. Requires AUDITOR, SECURITY_ADMIN, or TENANT_OWNER.
     */
    get: operations["AuditController_search"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/audit/investigate": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * AI-advisory audit investigation (Phase 10c)
     * @description Performs its own tenant-scoped OpenSearch query (the exact same AuditSearchService.search GET /audit uses -- never a client-suppliable tenant), then passes only those already-authorized results to manar-ai's InvestigateAudit RPC as context. manar-ai never performs its own retrieval. Requires AUDITOR, SECURITY_ADMIN, or TENANT_OWNER. `available: false` means manar-ai was unreachable -- never a crash, never a fabricated answer.
     */
    post: operations["AuditController_investigate"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/audit/verify": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Verify the tamper-evident audit chain
     * @description Walks every AuditEvent in recorded order, recomputing each row's hash and confirming chain linkage (anchor-aware: tolerates retention-pruned history). Requires AUDITOR, SECURITY_ADMIN, or TENANT_OWNER.
     */
    get: operations["AuditController_verify"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/events/live": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Live tenant-scoped audit event feed (Server-Sent Events)
     * @description A long-lived text/event-stream connection: an initial `: connected` comment, then one `event: audit-event` frame per new tenant event (`data:` is a JSON-encoded DomainEventEnvelope), plus periodic `: heartbeat` comments. No role restriction beyond authentication — any authenticated tenant user may watch. This describes the stream shape only; standard HTTP client generators typically cannot consume SSE the same way as a normal JSON response.
     */
    get: operations["LiveEventsController_live"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/evidence/export": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Export a signed evidence bundle
     * @description Gathers matching AuditEvents plus directly-relevant operational context (agents, tasks, delegations, policy versions, approvals, grants, tool invocations) into a signed/hashed bundle. At least one of since/until/agentId/taskId/correlationId is required.
     */
    post: operations["EvidenceController_export"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/kill-switches/platform": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Activate the platform-wide kill switch
     * @description Denies EVERY tenant, immediately — the single most destructive lever in the product. Requires SECURITY_ADMIN/TENANT_OWNER in the caller's own tenant AND the separate `X-Platform-Operator-Token` operator credential (see PlatformOperatorGuard).
     */
    post: operations["KillSwitchesController_activatePlatform"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/kill-switches/platform/deactivate": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Deactivate the platform-wide kill switch */
    post: operations["KillSwitchesController_deactivatePlatform"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/kill-switches": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List kill switches
     * @description Cursor-paginated, newest first. Optional `scope`/`active` filters. Excludes the platform-wide switch (a control-DB singleton with no id/list semantics of its own).
     */
    get: operations["KillSwitchesController_list"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/tenants/kill-switch": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Activate this tenant's kill switch */
    post: operations["KillSwitchesController_activateTenant"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/tenants/kill-switch/deactivate": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Deactivate this tenant's kill switch */
    post: operations["KillSwitchesController_deactivateTenant"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/agent-groups/{id}/kill-switch": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Activate an agent group's kill switch */
    post: operations["KillSwitchesController_activateAgentGroup"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/agent-groups/{id}/kill-switch/deactivate": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Deactivate an agent group's kill switch */
    post: operations["KillSwitchesController_deactivateAgentGroup"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/agents/{id}/kill-switch": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Activate an agent's kill switch */
    post: operations["KillSwitchesController_activateAgent"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/agents/{id}/kill-switch/deactivate": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Deactivate an agent's kill switch */
    post: operations["KillSwitchesController_deactivateAgent"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/tools/{id}/kill-switch": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Activate a tool's kill switch */
    post: operations["KillSwitchesController_activateTool"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/tools/{id}/kill-switch/deactivate": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Deactivate a tool's kill switch */
    post: operations["KillSwitchesController_deactivateTool"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/webhooks": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List registered webhook endpoints
     * @description Cursor-paginated, newest first (Phase 11b Part 1 — see src/common/pagination/cursor-pagination.ts). Optional `enabled` filter. Note: this response envelope changed from a bare array to `{ items, nextCursor }` in Phase 11b Part 1, matching every other list endpoint added that phase.
     */
    get: operations["WebhooksController_list"];
    put?: never;
    /**
     * Register a webhook endpoint
     * @description Generates a new HMAC signing secret and returns it in plaintext exactly once. The outbound URL is rejected if it resolves to a private/loopback/link-local/metadata-service address (SSRF protection). Supports an `Idempotency-Key` header — a replay with the same key returns the original response (and secret) rather than rotating it.
     */
    post: operations["WebhooksController_create"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/webhooks/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get a webhook endpoint */
    get: operations["WebhooksController_get"];
    put?: never;
    post?: never;
    /** Delete a webhook endpoint and its delivery history */
    delete: operations["WebhooksController_remove"];
    options?: never;
    head?: never;
    /**
     * Update a webhook endpoint
     * @description Partial update — only the provided fields change. Changing `url` re-runs the SSRF check.
     */
    patch: operations["WebhooksController_update"];
    trace?: never;
  };
  "/webhooks/{id}/deliveries": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** List a webhook endpoint's delivery history */
    get: operations["WebhooksController_listDeliveries"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/tools": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List registered tools
     * @description Cursor-paginated, newest first, each row including its ToolAction rows. Optional `enabled` filter.
     */
    get: operations["ToolsController_list"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/tenants/{slug}/oidc-config": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Resolve a tenant's public OIDC discovery info
     * @description Unauthenticated by design — needed before a human has any session (the tenant-slug login step, docs/human-auth.md). Returns only public discovery data (issuer URL, client ID, standard OIDC endpoint URLs); never the client secret.
     */
    get: operations["TenantsController_getOidcConfig"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/tenants/{slug}/oidc-client-secret": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Resolve a tenant's confidential OIDC client secret
     * @description BFF-only — gated by the `X-Manar-Bff-Token` shared service credential (see BffServiceGuard), never by a tenant JWT (there is none yet at this point in the login flow) and never by Keycloak master-admin credentials. Lets manar-web complete its OIDC authorization-code exchange server-side without holding its own copy of Keycloak admin credentials.
     */
    get: operations["TenantsController_getOidcClientSecret"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/users": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List users of the caller's tenant
     * @description Cursor-paginated, newest first. Each row includes its current RoleBinding set. Any authenticated tenant user may call this.
     */
    get: operations["UsersController_listUsers"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/users/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get one user, including its current RoleBindings */
    get: operations["UsersController_getUser"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/users/{id}/role-bindings": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Grant a role to a user
     * @description Requires TENANT_OWNER or SECURITY_ADMIN, AND enforces a privilege-escalation guard: the caller can never grant a role more privileged than any role they themselves currently hold (e.g. a SECURITY_ADMIN can never grant TENANT_OWNER, including to themselves) -- see src/auth/role-privilege.ts. Also updates the underlying Keycloak realm role mapping (the role-assignment source of truth -- see docs/human-auth.md), not just the local RoleBinding row, so the grant survives the user's next JwtAuthGuard sync. Audited.
     */
    post: operations["UsersController_grantRole"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/users/{id}/role-bindings/{role}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    /**
     * Revoke a role from a user
     * @description Requires TENANT_OWNER or SECURITY_ADMIN, AND enforces the same privilege-escalation guard as the grant endpoint, applied to revoke: the caller can never revoke a role more privileged than any role they themselves currently hold (e.g. a SECURITY_ADMIN can never strip TENANT_OWNER from anyone, including the actual owner) -- see src/auth/role-privilege.ts. Idempotent -- revoking a role the user doesn't currently hold succeeds as a no-op. Also updates the underlying Keycloak realm role mapping, not just the local RoleBinding row. Audited.
     */
    delete: operations["UsersController_revokeRole"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/tenant/settings": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Get the caller's tenant settings
     * @description Residency/AI-governance flags (Phase 2), plus read-only SSO/AI-provider/rate-limit info. Requires TENANT_OWNER or SECURITY_ADMIN.
     */
    get: operations["TenantSettingsController_getSettings"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    /**
     * Update the caller's tenant settings
     * @description Partial update -- only residency/allowExternalAi/allowOutboundTelemetry/allowCloudStorage are writable; every other field GET returns is read-only. Requires TENANT_OWNER or SECURITY_ADMIN. Audited. allowExternalAi takes effect immediately on the very next AI-advisory-eligible request (AiAdvisoryClient reads the live Tenant row, no caching).
     */
    patch: operations["TenantSettingsController_updateSettings"];
    trace?: never;
  };
  "/compliance/frameworks": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List compliance frameworks this codebase maps against
     * @description Currently ISO/IEC 27001:2022 and NIST AI RMF 1.0 — a representative subset, not exhaustive coverage of either standard. See docs/compliance-mapping.md.
     */
    get: operations["ComplianceController_listFrameworks"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/compliance/frameworks/{id}/controls": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List one framework's mapped controls
     * @description Each control includes its current mapping status/evidence — an honest self-assessment, never a certification claim.
     */
    get: operations["ComplianceController_listControls"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/incidents": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List incidents
     * @description Cursor-paginated, newest first. Optional status/severity filters.
     */
    get: operations["IncidentsController_list"];
    put?: never;
    /**
     * Create an incident
     * @description Audited (incident.created).
     */
    post: operations["IncidentsController_create"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/incidents/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get one incident */
    get: operations["IncidentsController_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    /**
     * Update an incident
     * @description Partial update -- title/description/severity/status/relatedCorrelationIds. A status change is audited (incident.status_changed). Setting status to RESOLVED stamps resolvedAt.
     */
    patch: operations["IncidentsController_update"];
    trace?: never;
  };
  "/incidents/summarize": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * AI-advisory incident summary (Phase 10c)
     * @description Gathers caller-specified context (an existing incidentId and/or explicit auditEventIds and/or free-text description -- all resolved against the caller's own tenant only) and calls manar-ai's SummarizeIncident RPC. Read-only: never persisted onto the Incident model. `available: false` means manar-ai was unreachable/timed out/circuit-open -- never a crash, never a fabricated summary.
     */
    post: operations["IncidentsController_summarize"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/ai-systems": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List AI systems
     * @description Cursor-paginated, newest first. Note there is deliberately no `coverage` filter: coverage is derived per record from live observations, so filtering on it server-side would either require deriving it for every row in the tenant or silently filtering only the current page — both of which would make the returned counts untrustworthy.
     */
    get: operations["AiSystemsController_list"];
    put?: never;
    /**
     * Register an AI system
     * @description Always created in DRAFT — the caller cannot choose a starting lifecycle state, because every other state is meant to be the result of a recorded transition. Audited (ai_system.created).
     */
    post: operations["AiSystemsController_create"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/ai-systems/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Get one AI system, with derived coverage
     * @description coverage is computed per request from real ToolInvocation rows and Agent.status — it is never stored. MONITORING_UNAVAILABLE means the observation source could not be consulted; it never means "no activity".
     */
    get: operations["AiSystemsController_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    /**
     * Update an AI system’s governed fields
     * @description Every field here is material: the prior state is snapshotted into the version history and `version` is incremented, in the same transaction as the update. `lifecycleState` cannot be changed here — use POST /ai-systems/:id/transitions. Audited (ai_system.updated).
     */
    patch: operations["AiSystemsController_update"];
    trace?: never;
  };
  "/ai-systems/{id}/transitions": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** The AI system’s lifecycle history */
    get: operations["AiSystemsController_transitions"];
    put?: never;
    /**
     * Move an AI system through its lifecycle
     * @description The only path that changes lifecycleState. Rejects any edge outside the allowed-transition table with 409. REVIEW→ACTIVE additionally requires a different user than the one who submitted the system for review (403 otherwise) — the review state is meaningless if one person can walk a record through it alone. Audited (ai_system.state_changed).
     */
    post: operations["AiSystemsController_transition"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/ai-systems/{id}/versions": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * The AI system’s material-change history
     * @description Newest first. Each entry is the full governed field set as it stood before the change that superseded it, plus who changed it and why.
     */
    get: operations["AiSystemsController_versions"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/ai-systems/{id}/agents": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Link an existing agent to this AI system
     * @description An additive, attributed, reversible assertion. It never rewrites the agent’s own ownership fields, and it does not by itself change what is enforced for that agent. Re-linking an already-linked agent returns linked:false rather than 409, so a retried request is unambiguous. Audited (ai_system.agent_linked).
     */
    post: operations["AiSystemsController_linkAgent"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/ai-systems/{id}/agents/{agentId}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    /**
     * Unlink an agent from this AI system
     * @description Audited (ai_system.agent_unlinked).
     */
    delete: operations["AiSystemsController_unlinkAgent"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/ai-systems/{id}/tools": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Link a registered tool to this AI system
     * @description Audited (ai_system.tool_linked).
     */
    post: operations["AiSystemsController_linkTool"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/ai-systems/{id}/tools/{toolId}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    /**
     * Unlink a tool from this AI system
     * @description Audited (ai_system.tool_unlinked).
     */
    delete: operations["AiSystemsController_unlinkTool"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    CreateAgentRequestDto: {
      /**
       * @description Lowercase alphanumeric with hyphens. Combined with the tenant slug to form this agent's SPIFFE-like `identifier` (`agent://<tenantSlug>/<slug>`).
       * @example edr-triage-bot
       */
      slug: string;
      /** @example EDR Triage Bot */
      displayName: string;
    };
    CreateAgentResponseDto: {
      /** Format: uuid */
      id: string;
      /** @example edr-triage-bot */
      slug: string;
      /** @example agent://acme-corp/edr-triage-bot */
      identifier: string;
      /** @example EDR Triage Bot */
      displayName: string;
      /**
       * @description Always `PENDING_ENROLLMENT` immediately after creation — an agent has no certificate yet, only a record. Transitions to `ACTIVE` once it completes `POST /agents/enroll`.
       * @example PENDING_ENROLLMENT
       * @enum {string}
       */
      status: "PENDING_ENROLLMENT" | "ACTIVE" | "REVOKED" | "KILLED";
      /** Format: date-time */
      createdAt: string;
    };
    ErrorResponseDto: {
      /** @example 400 */
      statusCode: number;
      /**
       * @description A human-readable message, or (only for class-validator-style array errors, which this codebase does not use) an array of them.
       * @example Invalid request body
       */
      message: string | string[];
      /** @example Bad Request */
      error: string;
    };
    AgentSummaryDto: {
      /** Format: uuid */
      id: string;
      /** @example edr-triage-bot */
      slug: string;
      /** @example agent://acme-corp/edr-triage-bot */
      identifier: string;
      /** @example EDR Triage Bot */
      displayName: string;
      /**
       * @example ACTIVE
       * @enum {string}
       */
      status: "PENDING_ENROLLMENT" | "ACTIVE" | "REVOKED" | "KILLED";
      /** Format: date-time */
      createdAt: string;
    };
    AgentListResponseDto: {
      items: components["schemas"]["AgentSummaryDto"][];
      /** @description Opaque token for the next page, or null when this is the last page. Pass back as `?cursor=`. */
      nextCursor: Record<string, never> | null;
    };
    CreateEnrollmentTokenResponseDto: {
      /** @description The raw, single-use enrollment token. Give this to the agent process out-of-band — it is never retrievable again once this response is sent. */
      token: string;
      /**
       * Format: date-time
       * @description Short TTL (15 minutes) — see AgentsService.ENROLLMENT_TOKEN_TTL_MS.
       */
      expiresAt: string;
    };
    RevokeAgentRequestDto: {
      /** @example Compromised host, rotating identity */
      reason: string;
    };
    RevokeStatusResponseDto: {
      /**
       * @example REVOKED
       * @enum {string}
       */
      status: "REVOKED";
    };
    ToolActionDto: {
      /** @example siem */
      toolId: string;
      /** @example query */
      actionId: string;
    };
    ResourceSelectorDto: {
      /** @example siem */
      toolId: string;
      /**
       * @description A literal resource identifier, or the wildcard "*".
       * @example *
       */
      pattern: string;
    };
    CreateTaskRequestDto: {
      /** @example Investigate suspicious login */
      name: string;
      description?: string;
      /**
       * Format: uuid
       * @description The Agent this task is assigned to.
       */
      assignedAgentId: string;
      /**
       * @description Cross-joined with allowedResourceSelectors (by toolId) to form the effective grant set — see grant-triples.ts.
       * @default []
       */
      allowedToolActions: components["schemas"]["ToolActionDto"][];
      /** @default [] */
      allowedResourceSelectors: components["schemas"]["ResourceSelectorDto"][];
      /**
       * @description Any (toolId, actionId) pair here is removed from the effective grant set even if also present in allowedToolActions — an explicit deny always wins.
       * @default []
       */
      forbiddenActions: components["schemas"]["ToolActionDto"][];
      /**
       * Format: date-time
       * @description Defaults to "now" if omitted.
       */
      startsAt?: string;
      /**
       * Format: date-time
       * @description Must be in the future.
       */
      expiresAt: string;
      /** @example null */
      maxExecutions?: number | null;
      /**
       * @description Conservative default — see Task.riskCeiling.
       * @default 20
       */
      riskCeiling: number;
    };
    CreateTaskResponseDto: {
      /** Format: uuid */
      id: string;
      /**
       * @example ACTIVE
       * @enum {string}
       */
      status: "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED" | "COMPLETED";
      /** Format: uuid */
      assignedAgentId: string;
      /** Format: date-time */
      expiresAt: string;
      /** Format: date-time */
      createdAt: string;
    };
    TaskSummaryDto: {
      /** Format: uuid */
      id: string;
      /** @example Investigate suspicious login */
      name: string;
      description: Record<string, never> | null;
      /**
       * @example ACTIVE
       * @enum {string}
       */
      status: "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED" | "COMPLETED";
      /** Format: uuid */
      assignedAgentId: string;
      /** Format: uuid */
      requesterId: string;
      /** Format: uuid */
      parentTaskId: Record<string, never> | null;
      /** Format: date-time */
      startsAt: string;
      /** Format: date-time */
      expiresAt: string;
      riskCeiling: number;
      /** Format: date-time */
      createdAt: string;
    };
    TaskListResponseDto: {
      items: components["schemas"]["TaskSummaryDto"][];
      nextCursor: Record<string, never> | null;
    };
    RevokeTaskRequestDto: {
      /** @example Investigation complete */
      reason: string;
    };
    PolicyRuleDto: {
      /** @description Audit/debugging label only, never matched against. */
      name?: string;
      /**
       * @description Exact toolId, or "*" for any tool.
       * @example *
       */
      toolId: string;
      /**
       * @description Exact actionId, or "*" for any action.
       * @example *
       */
      actionId: string;
      /**
       * @description Exact resource identifier, or "*". Omitted means "*".
       * @default *
       * @example *
       */
      resourcePattern: string;
      /**
       * @description Phase 15a (Section 53): if present, this rule only matches a request whose resolved ToolAction.classification equals this value exactly. Omitted means "match regardless of classification". See docs/data-classification.md.
       * @enum {string}
       */
      resourceClassification?: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
      /** @enum {string} */
      effect: "ALLOW" | "DENY" | "APPROVAL_REQUIRED" | "REQUIRE_APPROVAL";
      /** @description Additive contribution to RiskEngine's score when this rule matches. */
      riskWeight?: number;
      /** @description Minimum RiskEngine will clamp its score up to when this rule matches. */
      riskFloor?: number;
      /** @description Free-text rationale, never evaluated. */
      description?: string;
    };
    PolicyContentDto: {
      rules: components["schemas"]["PolicyRuleDto"][];
    };
    CreatePolicyRequestDto: {
      /** @example High-risk EDR containment actions */
      name: string;
      description?: string;
      /** @description The rule content as JSON. Mutually exclusive with contentYaml. */
      content?: components["schemas"]["PolicyContentDto"];
      /** @description The rule content as a YAML string, parsed into the same PolicyContentSchema. Mutually exclusive with content. */
      contentYaml?: string;
      reason?: string;
    };
    PolicyVersionResponseDto: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      policyId: string;
      /** @example 1 */
      version: number;
      /** @enum {string} */
      status: "DRAFT" | "PUBLISHED";
      content: components["schemas"]["PolicyContentDto"];
      /** @description sha256 hex of `content` after deterministic canonicalization. */
      contentHash: string;
      /** Format: uuid */
      authorId: string;
      reason: string | null;
      /** Format: uuid */
      previousVersionId: string | null;
      /** Format: date-time */
      publishedAt: string | null;
      /** Format: date-time */
      createdAt: string;
    };
    CreatePolicyResponseDto: {
      /** Format: uuid */
      id: string;
      name: string;
      description: string | null;
      /** Format: date-time */
      createdAt: string;
      latestVersion: components["schemas"]["PolicyVersionResponseDto"];
    };
    CreatePolicyVersionRequestDto: {
      content?: components["schemas"]["PolicyContentDto"];
      contentYaml?: string;
      /**
       * Format: uuid
       * @description Create a new DRAFT version whose content matches an existing version's content exactly (a rollback).
       */
      rollbackToVersionId?: string;
      reason?: string;
    };
    SuggestPolicyRequestDto: {
      /** @example SOC agents may query SIEM events but endpoint isolation requires human approval */
      naturalLanguageDescription: string;
      /**
       * Format: uuid
       * @description An existing policy — the draft becomes its next DRAFT version. Mutually exclusive with policyName.
       */
      policyId?: string;
      /** @description Create a brand-new policy with this name, alongside its first DRAFT version. Mutually exclusive with policyId. */
      policyName?: string;
      policyDescription?: string;
      reason?: string;
    };
    SuggestPolicyResponseDto: {
      available: boolean;
      /** Format: uuid */
      policyId: Record<string, never> | null;
      /** @description Always status DRAFT when present — never auto-published. */
      version: components["schemas"]["PolicyVersionResponseDto"] | null;
      explanation: string | null;
      confidence: number | null;
    };
    GetPolicyResponseDto: {
      /** Format: uuid */
      id: string;
      name: string;
      description: string | null;
      /** Format: date-time */
      createdAt: string;
      /** @description The current PUBLISHED version, or null if none has ever been published. */
      currentVersion: components["schemas"]["PolicyVersionResponseDto"] | null;
    };
    PolicyListResponseDto: {
      items: components["schemas"]["GetPolicyResponseDto"][];
      nextCursor: Record<string, never> | null;
    };
    ApprovalRequestSummaryDto: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      taskId: string;
      /** Format: uuid */
      agentId: string;
      toolId: string;
      actionId: string;
      resource: string;
      riskScore: number;
      /** Format: uuid */
      policyVersionId: string | null;
      /** @enum {string} */
      status: "PENDING" | "APPROVED" | "DENIED" | "EXPIRED";
      /** Format: date-time */
      requestedAt: string;
      /** Format: date-time */
      expiresAt: string;
    };
    ApprovalRequestListResponseDto: {
      items: components["schemas"]["ApprovalRequestSummaryDto"][];
      nextCursor: Record<string, never> | null;
    };
    ApprovalRequestDetailDto: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      taskId: string;
      /** Format: uuid */
      agentId: string;
      toolId: string;
      actionId: string;
      resource: string;
      /** @enum {string} */
      status: "PENDING" | "APPROVED" | "DENIED" | "EXPIRED";
      /** Format: date-time */
      requestedAt: string;
      /** Format: date-time */
      expiresAt: string;
      /** @description The invocation parameters, with credential-shaped values withheld. Redaction is KEY-NAME based, not content-based DLP: a secret under an innocuous key is not withheld. See redactedKeyPaths. */
      params: {
        [key: string]: unknown;
      };
      /** @description Dotted paths of every withheld value. Empty means nothing was withheld — a positive statement, not an absence of information. */
      redactedKeyPaths: string[];
      /** @description True when the parameter structure was too deep or too wide to render in full. The reviewer is looking at an incomplete object. */
      parametersTruncated: boolean;
      /** @description sha256 of the exact {taskId, toolId, actionId, resource, params} tuple an issued AuthorizationGrant is bound to. Recomputed from the stored row on every read. */
      parameterDigest: string;
      riskScore: number;
      /** @description null means NOT RECORDED (a row predating the breakdown migration) — never zero. */
      deterministicRiskScore: number | null;
      /** @description null means no advisory signal was available (unreachable, timed out, circuit open, or a fail-secure marker) — it never means the AI scored it zero. */
      aiAdvisoryScore: number | null;
      /** @description The Task.riskCeiling riskScore was compared against. */
      taskRiskCeiling: number | null;
      /**
       * @description null on rows predating the migration — render as "not recorded".
       * @enum {string|null}
       */
      requiredReason: "policy_requires_approval" | "risk_ceiling_exceeded" | null;
      deterministicReasonCodes: string[];
      /** @description Risk contributions attributed to the AI advisory signal (ai_advisory_* codes), kept separate from deterministic ones. */
      aiAdvisoryReasonCodes: string[];
      /** Format: uuid */
      policyVersionId: string | null;
      /** @description What this action does, from the ToolAction row: actionName, mutating, destructive, classification. null when the action row is no longer resolvable — reported as unknown rather than guessed. */
      expectedEffect: {
        [key: string]: unknown;
      } | null;
      /** @description Decisions recorded on this request, oldest first. */
      decisions: {
        [key: string]: unknown;
      }[];
      /** @description Whether an AuthorizationGrant was issued for this request. */
      grantIssued: boolean;
      /**
       * Format: date-time
       * @description When the single-use grant was redeemed, if it was.
       */
      grantConsumedAt: string | null;
    };
    DecideApprovalRequestDto: {
      /** @enum {string} */
      decision: "APPROVE" | "DENY";
      reason?: string;
    };
    DecideApprovalResponseDto: {
      /** Format: uuid */
      id: string;
      /**
       * @description ApprovalWorkflow's real terminal outcome, not the pre-signal PENDING status.
       * @example APPROVED
       * @enum {string}
       */
      status: "APPROVED" | "DENIED" | "EXPIRED";
      /**
       * @description The decision that actually took effect. Absent only when `status` is EXPIRED.
       * @enum {string}
       */
      decision?: "APPROVE" | "DENY";
    };
    AuditEventSearchResultDto: {
      /** Format: uuid */
      eventId: string;
      /** Format: uuid */
      tenantId: string;
      sequence: number;
      /** @example tool.invocation.completed */
      eventType: string;
      /** Format: uuid */
      correlationId: string;
      /** @description `{ type: "human"|"agent"|"system", id }` — see `AuditActor`. */
      actor: Record<string, never>;
      /** Format: date-time */
      timestamp: string;
      /** @description Event-type-specific payload (Section 46) — shape varies by eventType. */
      data: Record<string, never>;
      previousHash: Record<string, never> | null;
      eventHash: string;
      agentId?: string;
      taskId?: string;
      toolId?: string;
      actionId?: string;
      decision?: string;
      riskScore?: number;
    };
    AuditSearchResponseDto: {
      items: components["schemas"]["AuditEventSearchResultDto"][];
      nextCursor: Record<string, never> | null;
    };
    InvestigateAuditRequestDto: {
      /** @example Why was the endpoint-isolation action denied for agent X? */
      question: string;
      /** @description Comma-separated eventType values (OR). */
      eventType?: string;
      correlationId?: string;
      agentId?: string;
      taskId?: string;
      toolId?: string;
      actionId?: string;
      decision?: string;
      riskMin?: number;
      riskMax?: number;
      /** @description ISO-8601 inclusive lower bound. */
      from?: string;
      /** @description ISO-8601 inclusive upper bound. */
      to?: string;
      /** @description Max AuditEvents to retrieve as context, most recent first. Max 50, default 10. */
      contextLimit?: number;
    };
    AuditInvestigationAdvisoryDto: {
      /** @description Grounded only in the retrieved context. */
      answer: string;
      /** @description Which pieces of the retrieved context the answer relied on. */
      citations: string[];
      confidence: number;
      explanation: string;
    };
    InvestigateAuditResponseDto: {
      available: boolean;
      result: components["schemas"]["AuditInvestigationAdvisoryDto"] | null;
      /** @description How many of the caller's own tenant's AuditEvents were retrieved and sent as context. */
      contextEventCount: number;
    };
    VerifyAuditChainResponseDto: {
      /** @description True iff every event's hash and chain linkage verified correctly. */
      valid: boolean;
      /**
       * Format: uuid
       * @description Present only when valid=false: the AuditEvent.id where verification first failed.
       */
      brokenAt?: string;
    };
    LiveAuditEventEnvelopeDto: {
      /** Format: uuid */
      eventId: string;
      /** @description See Section 29's event-type catalog (audit-event-types.ts). */
      eventType: string;
      /** @example 1 */
      eventVersion: number;
      /** Format: uuid */
      tenantId: string;
      /** Format: date-time */
      timestamp: string;
      /** Format: uuid */
      correlationId: string;
      actor: {
        /** @enum {string} */
        type?: "human" | "agent" | "system";
        id?: string;
      };
      /** @description Heterogeneous, varies per eventType. */
      data: {
        [key: string]: unknown;
      };
      previousHash?: string | null;
      eventHash?: string;
      sequence?: number;
    };
    EvidenceExportRequestDto: {
      /** Format: date-time */
      since?: string;
      /** Format: date-time */
      until?: string;
      /** Format: uuid */
      agentId?: string;
      /** Format: uuid */
      taskId?: string;
      /** Format: uuid */
      correlationId?: string;
    };
    EvidenceFilterDto: {
      /** Format: date-time */
      since: string | null;
      /** Format: date-time */
      until: string | null;
      agentId: string | null;
      taskId: string | null;
      correlationId: string | null;
    };
    EvidenceEventDto: {
      /** Format: uuid */
      id: string;
      sequence: number;
      eventType: string;
      /** Format: uuid */
      correlationId: string;
      actor: {
        [key: string]: unknown;
      };
      /** Format: date-time */
      timestamp: string;
      data: {
        [key: string]: unknown;
      };
      previousHash: string | null;
      eventHash: string;
    };
    EvidenceCertificateDto: {
      serialNumber: string;
      subject: string;
      /** Format: date-time */
      notBefore: string;
      /** Format: date-time */
      notAfter: string;
      /** Format: date-time */
      revokedAt: string | null;
      revocationReason: string | null;
    };
    EvidenceAgentDto: {
      /** Format: uuid */
      id: string;
      slug: string;
      identifier: string;
      displayName: string;
      /** @enum {string} */
      status: "PENDING_ENROLLMENT" | "ACTIVE" | "REVOKED" | "KILLED";
      certificates: components["schemas"]["EvidenceCertificateDto"][];
    };
    EvidenceTaskDto: {
      /** Format: uuid */
      id: string;
      name: string;
      /** Format: uuid */
      requesterId: string;
      /** Format: uuid */
      assignedAgentId: string;
      /** Format: uuid */
      parentTaskId: string | null;
      /** @enum {string} */
      status: "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED" | "COMPLETED";
      riskCeiling: number;
      /** Format: date-time */
      expiresAt: string;
      /** Format: date-time */
      createdAt: string;
    };
    EvidenceTaskDelegationDto: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      parentTaskId: string;
      /** Format: uuid */
      childTaskId: string;
      /** Format: date-time */
      createdAt: string;
    };
    EvidencePolicyVersionDto: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      policyId: string;
      policyName: string;
      version: number;
      /** @enum {string} */
      status: "DRAFT" | "PUBLISHED";
      contentHash: string;
      /** Format: date-time */
      publishedAt: string | null;
    };
    EvidenceApprovalRequestDto: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      taskId: string;
      /** Format: uuid */
      agentId: string;
      toolId: string;
      actionId: string;
      resource: string;
      riskScore: number;
      /** @enum {string} */
      status: "PENDING" | "APPROVED" | "DENIED" | "EXPIRED";
      /** Format: date-time */
      requestedAt: string;
      /** Format: date-time */
      expiresAt: string;
    };
    EvidenceApprovalDecisionDto: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      approvalRequestId: string;
      /** Format: uuid */
      approverId: string;
      /** @enum {string} */
      decision: "APPROVE" | "DENY";
      reason: string | null;
      /** Format: date-time */
      decidedAt: string;
    };
    EvidenceAuthorizationGrantDto: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      approvalRequestId: string;
      /** Format: uuid */
      taskId: string;
      /** Format: uuid */
      agentId: string;
      toolId: string;
      actionId: string;
      riskScore: number;
      /** Format: date-time */
      issuedAt: string;
      /** Format: date-time */
      expiresAt: string;
      /** Format: date-time */
      consumedAt: string | null;
    };
    EvidenceToolInvocationDto: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      taskId: string;
      /** Format: uuid */
      agentId: string;
      toolId: string;
      actionId: string;
      resource: string;
      status: string;
      /** Format: date-time */
      startedAt: string;
      /** Format: date-time */
      completedAt: string | null;
      errorMessage: string | null;
    };
    EvidenceContextDto: {
      agents: components["schemas"]["EvidenceAgentDto"][];
      tasks: components["schemas"]["EvidenceTaskDto"][];
      taskDelegations: components["schemas"]["EvidenceTaskDelegationDto"][];
      policyVersions: components["schemas"]["EvidencePolicyVersionDto"][];
      approvalRequests: components["schemas"]["EvidenceApprovalRequestDto"][];
      approvalDecisions: components["schemas"]["EvidenceApprovalDecisionDto"][];
      authorizationGrants: components["schemas"]["EvidenceAuthorizationGrantDto"][];
      toolInvocations: components["schemas"]["EvidenceToolInvocationDto"][];
    };
    EvidenceBundleDto: {
      /** Format: uuid */
      tenantId: string;
      /** Format: uuid */
      exportId: string;
      /** Format: uuid */
      exportedBy: string;
      /** Format: date-time */
      generatedAt: string;
      filter: components["schemas"]["EvidenceFilterDto"];
      events: components["schemas"]["EvidenceEventDto"][];
      context: components["schemas"]["EvidenceContextDto"];
    };
    EvidenceBundleSignatureDto: {
      /** @description sha256 hex of canonicalize(bundle). */
      bundleHash: string;
      /** @description A compact HS256 JWT over { bundleHash } — the signature artifact a recipient verifies. */
      signature: string;
      /** @enum {string} */
      algorithm: "HS256";
    };
    EvidenceExportResponseDto: {
      /** Format: uuid */
      exportId: string;
      bundle: components["schemas"]["EvidenceBundleDto"];
      signature: components["schemas"]["EvidenceBundleSignatureDto"];
    };
    ActivateKillSwitchRequestDto: {
      /** @example Suspected credential compromise — isolating immediately */
      reason?: string;
    };
    PlatformKillSwitchStatusResponseDto: {
      active: boolean;
      reason: Record<string, never> | null;
      /** Format: date-time */
      activatedAt: Record<string, never> | null;
    };
    KillSwitchSummaryDto: {
      /** Format: uuid */
      id: string;
      /**
       * @example AGENT
       * @enum {string}
       */
      scope: "TENANT" | "AGENT_GROUP" | "AGENT" | "TOOL";
      /** Format: uuid */
      targetId: Record<string, never> | null;
      active: boolean;
      reason: Record<string, never> | null;
      /** Format: uuid */
      activatedBy: string;
      /** Format: date-time */
      activatedAt: string;
      /** Format: uuid */
      deactivatedBy: Record<string, never> | null;
      /** Format: date-time */
      deactivatedAt: Record<string, never> | null;
      /** Format: date-time */
      createdAt: string;
    };
    KillSwitchListResponseDto: {
      items: components["schemas"]["KillSwitchSummaryDto"][];
      nextCursor: Record<string, never> | null;
    };
    KillSwitchStatusResponseDto: {
      /** Format: uuid */
      id: string;
      /**
       * @example AGENT
       * @enum {string}
       */
      scope: "TENANT" | "AGENT_GROUP" | "AGENT" | "TOOL";
      /** Format: uuid */
      targetId: Record<string, never> | null;
      active: boolean;
      reason: Record<string, never> | null;
      /** Format: date-time */
      activatedAt: string;
    };
    KillSwitchDeactivatedResponseDto: {
      /**
       * @example INACTIVE
       * @enum {string}
       */
      status: "INACTIVE";
    };
    CreateWebhookEndpointRequestDto: {
      /** @example https://receiver.example.com/manar/webhook */
      url: string;
      /**
       * @description Must name at least one real event type from Phase 9a's catalog (`AUDIT_EVENT_TYPES`).
       * @example [
       *       "tool.invocation.completed",
       *       "kill_switch.activated"
       *     ]
       */
      subscribedEventTypes: string[];
      /** @default true */
      enabled: boolean;
    };
    WebhookEndpointCreatedResponseDto: {
      /** Format: uuid */
      id: string;
      url: string;
      subscribedEventTypes: string[];
      enabled: boolean;
      /** Format: uuid */
      createdBy: string;
      /** Format: date-time */
      createdAt: string;
      /** Format: date-time */
      updatedAt: string;
      /** @description The HMAC signing secret, in plaintext, shown exactly once. Store it now — there is no endpoint to retrieve it again. */
      secret: string;
    };
    WebhookEndpointResponseDto: {
      /** Format: uuid */
      id: string;
      url: string;
      subscribedEventTypes: string[];
      enabled: boolean;
      /** Format: uuid */
      createdBy: string;
      /** Format: date-time */
      createdAt: string;
      /** Format: date-time */
      updatedAt: string;
    };
    WebhookEndpointListResponseDto: {
      items: components["schemas"]["WebhookEndpointResponseDto"][];
      nextCursor: Record<string, never> | null;
    };
    UpdateWebhookEndpointRequestDto: {
      url?: string;
      subscribedEventTypes?: string[];
      enabled?: boolean;
    };
    WebhookDeliveryResponseDto: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      webhookEndpointId: string;
      eventId: string;
      eventType: string;
      /** @enum {string} */
      status: "PENDING" | "SUCCESS" | "FAILED";
      attempts: number;
      /** Format: date-time */
      lastAttemptAt: Record<string, never> | null;
      responseStatus: Record<string, never> | null;
      /** Format: date-time */
      createdAt: string;
    };
    ToolActionSummaryDto: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      toolId: string;
      /** @example isolate_host */
      name: string;
      description: Record<string, never> | null;
      riskBaseScore: number;
      mutating: boolean;
      destructive: boolean;
      approvalDefault: boolean;
      /**
       * @description Phase 15a (Section 53) data-sensitivity tag — see docs/data-classification.md. Defaults to INTERNAL.
       * @enum {string}
       */
      classification: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
    };
    ToolSummaryDto: {
      /** Format: uuid */
      id: string;
      /** @example edr */
      name: string;
      /** @example EDR */
      type: string;
      vendor: Record<string, never> | null;
      description: Record<string, never> | null;
      baseEndpoint: string;
      /** @enum {string} */
      protocol: "HTTP" | "MCP";
      enabled: boolean;
      actions: components["schemas"]["ToolActionSummaryDto"][];
      /** Format: date-time */
      createdAt: string;
    };
    ToolListResponseDto: {
      items: components["schemas"]["ToolSummaryDto"][];
      nextCursor: Record<string, never> | null;
    };
    TenantOidcConfigResponseDto: {
      /** Format: uuid */
      tenantId: string;
      /** @example acme-corp */
      slug: string;
      /**
       * @description The Keycloak realm name — equal to the tenant's slug.
       * @example acme-corp
       */
      realm: string;
      /** @example http://localhost:8081/realms/acme-corp */
      issuerUrl: string;
      /** @example manar-api */
      clientId: string;
      /** @example http://localhost:8081/realms/acme-corp/protocol/openid-connect/auth */
      authorizationEndpoint: string;
      /** @example http://localhost:8081/realms/acme-corp/protocol/openid-connect/token */
      tokenEndpoint: string;
      /** @example http://localhost:8081/realms/acme-corp/protocol/openid-connect/logout */
      endSessionEndpoint: string;
      /** @example http://localhost:8081/realms/acme-corp/protocol/openid-connect/certs */
      jwksUri: string;
    };
    TenantOidcClientSecretResponseDto: {
      /** @description The confidential client's secret, in plaintext. Only ever returned to a caller presenting the X-Manar-Bff-Token service credential — never to an arbitrary/unauthenticated caller. */
      clientSecret: string;
    };
    RoleBindingDto: {
      /** @enum {string} */
      role:
        | "TENANT_OWNER"
        | "SECURITY_ADMIN"
        | "AI_GOVERNANCE_MANAGER"
        | "SOC_OPERATOR"
        | "APPROVER"
        | "AUDITOR"
        | "DEVELOPER"
        | "READ_ONLY";
      /** Format: date-time */
      grantedAt: string;
      /** @description Free-text identifier of who/what granted this role — a UserProfile id for a Manar-side grant (Phase 14), or "keycloak:realm_access" for a role JwtAuthGuard synced directly from the token (see docs/human-auth.md). */
      grantedBy: string;
    };
    UserSummaryDto: {
      /** Format: uuid */
      id: string;
      /** @description The Keycloak JWT `sub` claim this user was found-or-created from. */
      keycloakSubject: string;
      email: string;
      displayName: string;
      /** Format: date-time */
      createdAt: string;
      /** Format: date-time */
      lastSeenAt: string;
      roles: components["schemas"]["RoleBindingDto"][];
    };
    UserListResponseDto: {
      items: components["schemas"]["UserSummaryDto"][];
      nextCursor: Record<string, never> | null;
    };
    GrantRoleRequestDto: {
      /** @enum {string} */
      role:
        | "TENANT_OWNER"
        | "SECURITY_ADMIN"
        | "AI_GOVERNANCE_MANAGER"
        | "SOC_OPERATOR"
        | "APPROVER"
        | "AUDITOR"
        | "DEVELOPER"
        | "READ_ONLY";
    };
    TenantSsoInfoDto: {
      realm: string;
      issuerUrl: string;
      clientId: string;
      authorizationEndpoint: string;
      tokenEndpoint: string;
      endSessionEndpoint: string;
      jwksUri: string;
    };
    TenantAiProviderInfoDto: {
      /**
       * @description Which provider manar-ai is currently configured to use for this deployment (AI_ADVISORY_PROVIDER, manar-api-side config -- see AiAdvisoryConfigSchema's doc comment for why manar-api cannot ask manar-ai this directly). Deployment-wide, not per-tenant.
       * @enum {string}
       */
      provider: "anthropic" | "ollama" | "vllm";
      /** @description Whether this provider is treated as leaving this deployment's own infrastructure -- only true for "anthropic". Governs whether this tenant's allowExternalAi flag has any effect. */
      isExternal: boolean;
    };
    TenantRateLimitInfoDto: {
      /** @description Read-only: deployment-wide, not per-tenant-adjustable. */
      humanRequestLimit: number;
      /** @description Read-only: deployment-wide, not per-tenant-adjustable. */
      humanWindowMs: number;
    };
    TenantSettingsResponseDto: {
      /** Format: uuid */
      tenantId: string;
      slug: string;
      name: string;
      /** @enum {string} */
      residency: "UAE" | "CUSTOM_REGION" | "AIR_GAPPED";
      /** @description Whether this tenant's AI-advisory-eligible requests may reach an external AI provider. Takes effect immediately -- AiAdvisoryClient reads this tenant row live on every call, no caching. */
      allowExternalAi: boolean;
      allowOutboundTelemetry: boolean;
      allowCloudStorage: boolean;
      /** Format: date-time */
      updatedAt: string;
      /** @description Read-only display of this tenant's Keycloak realm/issuer info (Phase 11b's GET /tenants/:slug/oidc-config, mirrored here for a same-request authenticated view). SSO federation configuration itself lives in Keycloak's own admin console -- null if this tenant has no provisioned realm yet. */
      sso: components["schemas"]["TenantSsoInfoDto"] | null;
      aiProvider: components["schemas"]["TenantAiProviderInfoDto"];
      rateLimit: components["schemas"]["TenantRateLimitInfoDto"];
    };
    UpdateTenantSettingsRequestDto: {
      /** @enum {string} */
      residency?: "UAE" | "CUSTOM_REGION" | "AIR_GAPPED";
      allowExternalAi?: boolean;
      allowOutboundTelemetry?: boolean;
      allowCloudStorage?: boolean;
    };
    ComplianceFrameworkSummaryDto: {
      /** Format: uuid */
      id: string;
      /** @example ISO/IEC 27001 */
      name: string;
      /** @example 2022 */
      version: string;
    };
    ComplianceFrameworkListResponseDto: {
      items: components["schemas"]["ComplianceFrameworkSummaryDto"][];
    };
    ComplianceMappingSummaryDto: {
      /** @enum {string} */
      status: "MAPPED" | "EVIDENCE_AVAILABLE" | "PARTIALLY_IMPLEMENTED" | "NOT_EVALUATED";
      /** @description Free text pointing at real, specific capabilities this codebase has built and tested — never fabricated. */
      evidenceDescription: string;
      /** @example docs/audit-chain.md */
      evidenceReference: Record<string, never> | null;
      /** Format: date-time */
      assessedAt: string;
    };
    ComplianceControlWithMappingDto: {
      /** Format: uuid */
      id: string;
      /**
       * @description The framework's own control numbering.
       * @example A.5.15
       */
      controlId: string;
      /** @example Access control */
      title: string;
      description: string;
      /** @description Always present for this phase's seeded controls; nullable only because the schema does not structurally forbid a control with no mapping. */
      mapping: components["schemas"]["ComplianceMappingSummaryDto"] | null;
    };
    ComplianceControlListResponseDto: {
      items: components["schemas"]["ComplianceControlWithMappingDto"][];
    };
    CreateIncidentRequestDto: {
      /** @example Suspected credential compromise on WS-042 */
      title: string;
      description: string;
      /** @enum {string} */
      severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      /** @description AuditEvent.correlationId values this incident is linked to — see docs/audit-chain.md. Defaults to an empty array. */
      relatedCorrelationIds?: string[];
    };
    IncidentSummaryDto: {
      /** Format: uuid */
      id: string;
      title: string;
      description: string;
      /** @enum {string} */
      severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      /** @enum {string} */
      status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "CLOSED";
      relatedCorrelationIds: string[];
      /**
       * Format: uuid
       * @description UserProfile ID of the creator.
       */
      createdBy: string;
      /** Format: date-time */
      createdAt: string;
      /** Format: date-time */
      resolvedAt: Record<string, never> | null;
    };
    IncidentListResponseDto: {
      items: components["schemas"]["IncidentSummaryDto"][];
      nextCursor: Record<string, never> | null;
    };
    SummarizeIncidentRequestDto: {
      /**
       * Format: uuid
       * @description An existing Incident (must belong to the caller's own tenant). Its title/description and the AuditEvents matching its relatedCorrelationIds are included as context.
       */
      incidentId?: string;
      /** @description Additional free-text context, combined with incidentId's own title/description when both are provided. */
      description?: string;
      /** @description Explicit AuditEvent IDs to include as context, in addition to any resolved from incidentId. Always resolved against the caller's own tenant database — an id belonging to another tenant is silently omitted, never fetched. */
      auditEventIds?: string[];
    };
    IncidentSummaryAdvisoryDto: {
      summary: string;
      keyEvents: string[];
      /** @description Best-effort, advisory-only hypothesis — never confirmed. */
      probableRootCause: string;
      recommendedNextSteps: string[];
      confidence: number;
      explanation: string;
    };
    SummarizeIncidentResponseDto: {
      available: boolean;
      result: components["schemas"]["IncidentSummaryAdvisoryDto"] | null;
      /** @description How many AuditEvents were included as context. */
      contextEventCount: number;
    };
    UpdateIncidentRequestDto: {
      title?: string;
      description?: string;
      /** @enum {string} */
      severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      /**
       * @description A status transition -- setting RESOLVED (from a non-RESOLVED status) stamps resolvedAt. Audited (incident.status_changed) whenever this actually changes the current status.
       * @enum {string}
       */
      status?: "OPEN" | "INVESTIGATING" | "RESOLVED" | "CLOSED";
      relatedCorrelationIds?: string[];
    };
    CreateAiSystemRequestDto: {
      /**
       * @description Lowercase kebab-case, unique per tenant, immutable after creation (it appears in deep links and exported evidence).
       * @example claims-triage-assistant
       */
      slug: string;
      /** @example Claims triage assistant */
      name: string;
      /** @description What this system is for, in business terms. Required. */
      businessPurpose: string;
      /**
       * Format: uuid
       * @description UserProfile.id of the accountable owner. Verified to exist in this tenant before the record is written.
       */
      ownerId: string;
      /** @example Claims Operations */
      businessUnit: string;
      /** @enum {string} */
      environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
      /**
       * @description The classification of data this system is DECLARED to handle. Defaults to INTERNAL — the same safe default ToolAction.classification uses.
       * @enum {string}
       */
      dataClassification?: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
      /** @description Declared, never verified. Drift between this and the API/AI service’s actually-configured provider is a governance finding, not something this field reconciles. */
      declaredProvider?: string;
      declaredModel?: string;
      riskRationale: string;
      /**
       * Format: date-time
       * @description When this record is next due for review. Absent means unscheduled — which the console renders as unscheduled, never as “not due”.
       */
      nextReviewDate?: string;
    };
    AiSystemSummaryDto: {
      /** Format: uuid */
      id: string;
      slug: string;
      name: string;
      businessPurpose: string;
      /** Format: uuid */
      ownerId: string;
      businessUnit: string;
      /** @enum {string} */
      environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
      /** @enum {string} */
      lifecycleState: "DRAFT" | "REVIEW" | "ACTIVE" | "SUSPENDED" | "RETIRED";
      /** @enum {string} */
      dataClassification: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
      declaredProvider: Record<string, never> | null;
      declaredModel: Record<string, never> | null;
      riskRationale: string;
      /** Format: date-time */
      nextReviewDate: Record<string, never> | null;
      /** @description Incremented on every material change. */
      version: number;
      /** Format: date-time */
      createdAt: string;
      /** Format: uuid */
      createdBy: string;
      /** Format: date-time */
      updatedAt: string;
    };
    AiSystemListResponseDto: {
      items: components["schemas"]["AiSystemSummaryDto"][];
      /** @description Opaque cursor for the next page; null when exhausted. */
      nextCursor: Record<string, never> | null;
    };
    AiSystemCoverageDto: {
      /** @enum {string} */
      coverage: "GOVERNED" | "OBSERVED_ONLY" | "DECLARED_ONLY" | "MONITORING_UNAVAILABLE";
      linkedAgentCount: number;
      /** @description How many linked agents are ACTIVE — i.e. would be subject to enforcement if they ran now. Separate from coverage on purpose. */
      activeLinkedAgentCount: number;
      observedAgentCount: number;
      /** Format: date-time */
      lastObservedAt: Record<string, never> | null;
      observationWindowDays: number;
    };
    AiSystemLinkedAgentDto: {
      /** Format: uuid */
      agentId: string;
      slug: string;
      displayName: string;
      status: string;
      /** Format: date-time */
      linkedAt: string;
      /** Format: uuid */
      linkedBy: string;
      /** Format: date-time */
      lastObservedAt: Record<string, never> | null;
    };
    AiSystemLinkedToolDto: {
      /** Format: uuid */
      toolId: string;
      name: string;
      /** Format: date-time */
      linkedAt: string;
      /** Format: uuid */
      linkedBy: string;
    };
    AiSystemDetailDto: {
      /** Format: uuid */
      id: string;
      slug: string;
      name: string;
      businessPurpose: string;
      /** Format: uuid */
      ownerId: string;
      businessUnit: string;
      /** @enum {string} */
      environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
      /** @enum {string} */
      lifecycleState: "DRAFT" | "REVIEW" | "ACTIVE" | "SUSPENDED" | "RETIRED";
      /** @enum {string} */
      dataClassification: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
      declaredProvider: Record<string, never> | null;
      declaredModel: Record<string, never> | null;
      riskRationale: string;
      /** Format: date-time */
      nextReviewDate: Record<string, never> | null;
      /** @description Incremented on every material change. */
      version: number;
      /** Format: date-time */
      createdAt: string;
      /** Format: uuid */
      createdBy: string;
      /** Format: date-time */
      updatedAt: string;
      coverage: components["schemas"]["AiSystemCoverageDto"];
      linkedAgents: components["schemas"]["AiSystemLinkedAgentDto"][];
      linkedTools: components["schemas"]["AiSystemLinkedToolDto"][];
    };
    UpdateAiSystemRequestDto: {
      name?: string;
      businessPurpose?: string;
      /** Format: uuid */
      ownerId?: string;
      businessUnit?: string;
      /** @enum {string} */
      environment?: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
      /** @enum {string} */
      dataClassification?: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
      /** @description Explicit null clears the declaration; omit to leave unchanged. */
      declaredProvider?: Record<string, never> | null;
      declaredModel?: Record<string, never> | null;
      riskRationale?: string;
      /** Format: date-time */
      nextReviewDate?: Record<string, never> | null;
      /** @description Required. Every field on this DTO is material, so every update snapshots the prior state into the version history — an unexplained material change is not evidence of anything. */
      changeReason: string;
    };
    TransitionAiSystemRequestDto: {
      /**
       * @description Target state. Allowed edges: DRAFT→REVIEW/RETIRED, REVIEW→ACTIVE/DRAFT/RETIRED, ACTIVE→SUSPENDED/RETIRED, SUSPENDED→ACTIVE/RETIRED. RETIRED is terminal.
       * @enum {string}
       */
      toState: "DRAFT" | "REVIEW" | "ACTIVE" | "SUSPENDED" | "RETIRED";
      reason: string;
    };
    AiSystemVersionDto: {
      /** @description The version this snapshot replaces. */
      version: number;
      /** @description The governed field set as it stood before the change. */
      snapshot: {
        [key: string]: unknown;
      };
      changeReason: string;
      /** Format: uuid */
      changedBy: string;
      /** Format: date-time */
      changedAt: string;
    };
    AiSystemTransitionDto: {
      /** @enum {string} */
      fromState: "DRAFT" | "REVIEW" | "ACTIVE" | "SUSPENDED" | "RETIRED";
      /** @enum {string} */
      toState: "DRAFT" | "REVIEW" | "ACTIVE" | "SUSPENDED" | "RETIRED";
      reason: string;
      /** Format: uuid */
      actorId: string;
      /** Format: date-time */
      at: string;
    };
    LinkAgentRequestDto: {
      /** Format: uuid */
      agentId: string;
    };
    AiSystemLinkResultDto: {
      linked?: boolean;
      unlinked?: boolean;
    };
    LinkToolRequestDto: {
      /** Format: uuid */
      toolId: string;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  AppController_getHello: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  HealthController_live: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  HealthController_ready: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  AgentsController_listAgents: {
    parameters: {
      query?: {
        status?: "PENDING_ENROLLMENT" | "ACTIVE" | "REVOKED" | "KILLED";
        /** @description Max 100, default 20. */
        limit?: number;
        /** @description Opaque `nextCursor` from a previous page. */
        cursor?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AgentListResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  AgentsController_createAgent: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateAgentRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CreateAgentResponseDto"];
        };
      };
      /** @description Invalid request body. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  AgentsController_createEnrollmentToken: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Agent ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CreateEnrollmentTokenResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description Agent not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  AgentsController_revokeAgent: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Agent ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["RevokeAgentRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RevokeStatusResponseDto"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description Agent not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  AgentEnrollController_enroll: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  TasksController_listTasks: {
    parameters: {
      query?: {
        status?: "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED" | "COMPLETED";
        assignedAgentId?: string;
        /** @description Max 100, default 20. */
        limit?: number;
        /** @description Opaque `nextCursor` from a previous page. */
        cursor?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["TaskListResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  TasksController_createTask: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateTaskRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CreateTaskResponseDto"];
        };
      };
      /** @description Invalid body, or assignedAgentId does not resolve to an agent in this tenant. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  TasksController_revokeTask: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Task ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["RevokeTaskRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RevokeStatusResponseDto"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description Task not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  PolicyController_listPolicies: {
    parameters: {
      query?: {
        /** @description Max 100, default 20. */
        limit?: number;
        /** @description Opaque `nextCursor` from a previous page. */
        cursor?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PolicyListResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  PolicyController_createPolicy: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreatePolicyRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CreatePolicyResponseDto"];
        };
      };
      /** @description Invalid body, or invalid policy content. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  PolicyController_listVersions: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Policy ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PolicyVersionResponseDto"][];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description Policy not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  PolicyController_createVersion: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Policy ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreatePolicyVersionRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PolicyVersionResponseDto"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description Policy (or rollback target version) not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  PolicyController_suggestPolicy: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SuggestPolicyRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SuggestPolicyResponseDto"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description policyId was provided but not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  PolicyController_publishVersion: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Policy ID */
        id: string;
        /** @description PolicyVersion ID */
        versionId: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PolicyVersionResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description Policy or version not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description Version is not DRAFT. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  PolicyController_getPolicy: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Policy ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["GetPolicyResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description Policy not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  PolicyController_getVersion: {
    parameters: {
      query?: {
        /** @description Pass "yaml" to receive text/yaml instead of JSON. */
        format?: "yaml";
      };
      header?: never;
      path: {
        /** @description Policy ID */
        id: string;
        /** @description PolicyVersion ID */
        versionId: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PolicyVersionResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description Policy or version not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  ApprovalsController_list: {
    parameters: {
      query?: {
        status?: "PENDING" | "APPROVED" | "DENIED" | "EXPIRED";
        /** @description Max 100, default 20. */
        limit?: number;
        /** @description Opaque `nextCursor` from a previous page. */
        cursor?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApprovalRequestListResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  ApprovalsController_getOne: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description ApprovalRequest ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ApprovalRequestDetailDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description No such approval request in this tenant. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  ApprovalsController_decide: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description ApprovalRequest ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["DecideApprovalRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["DecideApprovalResponseDto"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description ApprovalRequest not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description Request is not PENDING, or could not be signaled. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description The signal was sent but the workflow did not resolve to a final outcome within APPROVAL_DECIDE_RESULT_TIMEOUT_MS. */
      504: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  AuditController_search: {
    parameters: {
      query?: {
        /** @description Comma-separated list of exact eventType values (OR). */
        eventType?: string;
        correlationId?: string;
        agentId?: string;
        taskId?: string;
        toolId?: string;
        actionId?: string;
        /** @description ALLOW, DENY, APPROVAL_REQUIRED, APPROVE, or DENY (approval decisions). REQUIRE_APPROVAL also appears in events written before the Phase 1 rename. */
        decision?: string;
        riskMin?: number;
        riskMax?: number;
        /** @description ISO-8601 — inclusive lower bound on timestamp. */
        from?: string;
        /** @description ISO-8601 — inclusive upper bound on timestamp. */
        to?: string;
        /** @description Max 100, default 20. */
        limit?: number;
        /** @description Opaque `nextCursor` from a previous page. */
        cursor?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AuditSearchResponseDto"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  AuditController_investigate: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["InvestigateAuditRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["InvestigateAuditResponseDto"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  AuditController_verify: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["VerifyAuditChainResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  LiveEventsController_live: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description text/event-stream — each `audit-event` frame's data is a LiveAuditEventEnvelopeDto. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "text/event-stream": components["schemas"]["LiveAuditEventEnvelopeDto"];
        };
      };
    };
  };
  EvidenceController_export: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["EvidenceExportRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["EvidenceExportResponseDto"];
        };
      };
      /** @description No filter dimension provided, or invalid body. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  KillSwitchesController_activatePlatform: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ActivateKillSwitchRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PlatformKillSwitchStatusResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  KillSwitchesController_deactivatePlatform: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PlatformKillSwitchStatusResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  KillSwitchesController_list: {
    parameters: {
      query?: {
        scope?: "TENANT" | "AGENT_GROUP" | "AGENT" | "TOOL";
        active?: boolean;
        /** @description Max 100, default 20. */
        limit?: number;
        /** @description Opaque `nextCursor` from a previous page. */
        cursor?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["KillSwitchListResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  KillSwitchesController_activateTenant: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ActivateKillSwitchRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["KillSwitchStatusResponseDto"];
        };
      };
    };
  };
  KillSwitchesController_deactivateTenant: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["KillSwitchDeactivatedResponseDto"];
        };
      };
    };
  };
  KillSwitchesController_activateAgentGroup: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description AgentGroup ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ActivateKillSwitchRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["KillSwitchStatusResponseDto"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  KillSwitchesController_deactivateAgentGroup: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description AgentGroup ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["KillSwitchDeactivatedResponseDto"];
        };
      };
    };
  };
  KillSwitchesController_activateAgent: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Agent ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ActivateKillSwitchRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["KillSwitchStatusResponseDto"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  KillSwitchesController_deactivateAgent: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Agent ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["KillSwitchDeactivatedResponseDto"];
        };
      };
    };
  };
  KillSwitchesController_activateTool: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Tool ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ActivateKillSwitchRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["KillSwitchStatusResponseDto"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  KillSwitchesController_deactivateTool: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Tool ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["KillSwitchDeactivatedResponseDto"];
        };
      };
    };
  };
  WebhooksController_list: {
    parameters: {
      query?: {
        enabled?: boolean;
        /** @description Max 100, default 20. */
        limit?: number;
        /** @description Opaque `nextCursor` from a previous page. */
        cursor?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["WebhookEndpointListResponseDto"];
        };
      };
    };
  };
  WebhooksController_create: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateWebhookEndpointRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["WebhookEndpointCreatedResponseDto"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  WebhooksController_get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["WebhookEndpointResponseDto"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  WebhooksController_remove: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  WebhooksController_update: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateWebhookEndpointRequestDto"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["WebhookEndpointResponseDto"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  WebhooksController_listDeliveries: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["WebhookDeliveryResponseDto"][];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  ToolsController_list: {
    parameters: {
      query?: {
        enabled?: boolean;
        /** @description Max 100, default 20. */
        limit?: number;
        /** @description Opaque `nextCursor` from a previous page. */
        cursor?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ToolListResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  TenantsController_getOidcConfig: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description The tenant's slug (== its Keycloak realm name) */
        slug: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["TenantOidcConfigResponseDto"];
        };
      };
      /** @description No such tenant, or its Keycloak realm was never provisioned. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  TenantsController_getOidcClientSecret: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description The tenant's slug (== its Keycloak realm name) */
        slug: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["TenantOidcClientSecretResponseDto"];
        };
      };
      /** @description Missing or invalid X-Manar-Bff-Token header. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description No such tenant, or it has no stored client secret. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  UsersController_listUsers: {
    parameters: {
      query?: {
        /** @description Max 100, default 20. */
        limit?: number;
        /** @description Opaque `nextCursor` from a previous page. */
        cursor?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["UserListResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  UsersController_getUser: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description UserProfile ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["UserSummaryDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description User not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  UsersController_grantRole: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description UserProfile ID of the user being granted a role */
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["GrantRoleRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["UserSummaryDto"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description Caller lacks TENANT_OWNER/SECURITY_ADMIN, or the privilege-escalation guard rejected this grant. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description User not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  UsersController_revokeRole: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description UserProfile ID */
        id: string;
        role:
          | "TENANT_OWNER"
          | "SECURITY_ADMIN"
          | "AI_GOVERNANCE_MANAGER"
          | "SOC_OPERATOR"
          | "APPROVER"
          | "AUDITOR"
          | "DEVELOPER"
          | "READ_ONLY";
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["UserSummaryDto"];
        };
      };
      /** @description Unknown role. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description Caller lacks TENANT_OWNER/SECURITY_ADMIN, or the privilege-escalation guard rejected this revoke. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description User not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  TenantSettingsController_getSettings: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["TenantSettingsResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  TenantSettingsController_updateSettings: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateTenantSettingsRequestDto"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["TenantSettingsResponseDto"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  ComplianceController_listFrameworks: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ComplianceFrameworkListResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  ComplianceController_listControls: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description ComplianceFramework ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ComplianceControlListResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description Framework not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  IncidentsController_list: {
    parameters: {
      query?: {
        status?: "OPEN" | "INVESTIGATING" | "RESOLVED" | "CLOSED";
        severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        /** @description Max 100, default 20. */
        limit?: number;
        /** @description Opaque `nextCursor` from a previous page. */
        cursor?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["IncidentListResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  IncidentsController_create: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateIncidentRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["IncidentSummaryDto"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  IncidentsController_get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Incident ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["IncidentSummaryDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description Incident not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  IncidentsController_update: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Incident ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateIncidentRequestDto"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["IncidentSummaryDto"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description Incident not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  IncidentsController_summarize: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SummarizeIncidentRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SummarizeIncidentResponseDto"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description incidentId was provided but not found in this tenant. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  AiSystemsController_list: {
    parameters: {
      query?: {
        lifecycleState?: "DRAFT" | "REVIEW" | "ACTIVE" | "SUSPENDED" | "RETIRED";
        environment?: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
        ownerId?: string;
        limit?: number;
        cursor?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AiSystemListResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  AiSystemsController_create: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateAiSystemRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AiSystemSummaryDto"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description ownerId does not resolve to a user in this tenant. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description slug already exists in this tenant. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  AiSystemsController_get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AiSystemDetailDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  AiSystemsController_update: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateAiSystemRequestDto"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AiSystemSummaryDto"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description The system is RETIRED and can no longer be modified. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  AiSystemsController_transitions: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AiSystemTransitionDto"][];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  AiSystemsController_transition: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["TransitionAiSystemRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AiSystemSummaryDto"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description Insufficient role, or separation of duties: the same user submitted this system for review. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      /** @description Not an allowed lifecycle edge from the current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  AiSystemsController_versions: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AiSystemVersionDto"][];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  AiSystemsController_linkAgent: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["LinkAgentRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AiSystemLinkResultDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  AiSystemsController_unlinkAgent: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
        agentId: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AiSystemLinkResultDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  AiSystemsController_linkTool: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["LinkToolRequestDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AiSystemLinkResultDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
  AiSystemsController_unlinkTool: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
        toolId: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AiSystemLinkResultDto"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponseDto"];
        };
      };
    };
  };
}
