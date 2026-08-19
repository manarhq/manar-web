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
      /** @enum {string} */
      effect: "ALLOW" | "DENY" | "REQUIRE_APPROVAL";
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
      policyVersionId: Record<string, never> | null;
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
        /** @description ALLOW, DENY, REQUIRE_APPROVAL, APPROVE, or DENY (approval decisions). */
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
}
