# Design rework — plan

Status: approved, in progress. This is the working spec for reworking
the SOC console's visual design and navigation, plus wiring up the three
AI-advisory endpoints that have no UI yet
(`/incidents/summarize`, `/policies/suggest`, `/audit/investigate`).

## Why

The current UI (Phase 11a/11b/14/15b) is functionally complete against
real data but visually reads as AI-template-generated: every page is
title + description + filter + bare table + a large empty void, raw
system data (UUIDs, `dot.notation` event strings) leaks straight into
the UI, ALL-CAPS TRACKED LABELS are used as the default texture for
every label instead of a deliberate category marker, and one flat teal
accent is used indiscriminately for navigation state, "verified," and
"live" with no actual risk/severity color language despite risk being
the product's core concept. Navigation is a flat 16-item list with no
breadcrumbs, no quick-jump, and no indication of what needs attention.

## Design tokens

**Color** (dark-mode-first, unchanged approach, refined values):

```
--bg-base:            #0A0D12   (page background — deeper/cooler than before)
--bg-surface:          #12161D  (cards, table surfaces)
--bg-surface-raised:   #191E27  (hover states, raised panels)
--border-subtle:       #232935
--text-primary:        #F4F6F8
--text-secondary:      #9AA4B2
--text-tertiary:       #626D7C

--accent (primary UI): #E9A23B  (amber/signal-gold — buttons, active nav,
                                  links, focus rings. Replaces the old
                                  flat teal used for everything.)
--accent-hover:        #F5B255

--state-safe:          #3FBF7F  (verified / active / success — reserved
                                  for this meaning ONLY, never reused as
                                  a generic accent)
--risk-low:             (existing lib/risk.ts band — leave thresholds
                          alone, don't touch risk semantics)
--risk-medium:         #E0B23D
--risk-high:            #E2793A
--risk-critical:        #E14F4F
```

Read the existing `lib/risk.ts`/`RiskBadge`/`RiskMeter` before touching
anything risk-colored — the band _thresholds_ are correct and tested
against real backend risk scores, this rework only changes their visual
treatment (see Signature element below), never the logic.

**Type**: keep Geist Sans (it's fine). Sentence case is the default for
everything — table column headers, stat card labels, empty states.
Reserve ALL-CAPS + letter-spacing _only_ for the three true sidebar
category dividers (Monitoring / Governance / Administration) — nowhere
else. Table headers go from `REQUESTED` to `Requested`, stat labels from
`AUDIT CHAIN INTEGRITY` to `Audit chain integrity`.

**Data humanization** (apply everywhere, not just one page):

- Actor UUIDs → resolve to display name where the data is available
  (audit events carry an actor id; resolve against `UserProfile`/`Agent`
  the same way other pages already do lookups — check `hooks/use-users.ts`
  /`hooks/use-agents.ts` for the existing pattern before adding a new one).
- Event type strings (`policy.published`, `tenant.settings_updated`) →
  a small humanization map (`lib/humanize-event-type.ts` or similar) →
  "Policy published," "Tenant settings updated." Keep the raw string
  available on hover/title attribute for anyone who needs it, don't
  destroy the information, just don't lead with it.
- Tenant slug badge: drop the monospace pill treatment, it visually
  competes with real content for no reason.

**Signature element — the risk meter.** This product's one job is
assessing and gating risk; that's what should be visually distinctive,
not a decorative flourish elsewhere. Redesign `RiskMeter` (keep
`RiskBadge` as the compact inline version) into a real, deliberate gauge
— an arc or segmented-bar treatment with the band thresholds visibly
marked, not a generic flat progress bar. Use it consistently everywhere
a risk score appears (approvals, tasks, audit detail) and make it the
featured element on the reworked Overview page (see below).

**Layout**: no page should be a floating block in a mostly-empty
viewport. Specifics:

- **Overview**: rework into a real dashboard — the risk-meter signature
  element showing current aggregate/active risk, an agent status summary
  (active/revoked/killed counts from `GET /agents`), a pending-approvals
  callout when non-zero, and a recent-activity list (last ~8 audit
  events, humanized) — all real data via existing hooks, no new backend
  needed.
- **List pages**: either constrain table width sensibly with real
  padding, or use the freed width for a detail/preview rail. Use
  judgment per page — don't force one pattern everywhere if it doesn't
  fit the content.
- **Empty states**: every "No X yet" gets a real empty-state treatment
  (icon, one-sentence explanation, a next action where one exists —
  e.g. Tasks' empty state should point at "Create task") — never a lone
  gray sentence floating in a void. Build one shared `EmptyState`
  component, use it everywhere.

## Navigation

- **Breadcrumbs** on every `/x/[id]` detail page (`Agents / SOC Response
Agent`, etc.) in the topbar.
- **Cmd+K quick-jump**: search agents/tasks/policies/tools/incidents by
  name, navigate directly to their detail page. Use existing list
  endpoints (client-side filter is fine at this data scale — no new
  backend search endpoint needed for this).
- **Attention counts** on sidebar items where a real number is
  meaningful: Approvals (pending count), Incidents (open count). Real
  data via existing endpoints, refetch on a reasonable interval or via
  existing SSE plumbing if convenient — don't overbuild this.
- Sidebar **grouping stays as-is** (Monitoring / Governance /
  Administration) — this rework adds wayfinding on top, it does not
  restructure the group taxonomy.

## Three new AI-advisory buttons

Backend endpoints already exist and are tested (`manar-api` Phase 10c) —
this is UI-only work.

- **`/incidents/[id]`**: a "Summarize with AI" button/panel calling
  `POST /incidents/summarize` with that incident's id (and its
  `relatedCorrelationIds`, which the backend resolves to audit events
  itself — check the DTO shape before assuming what to send). Show the
  result inline or in a side panel; make clear it's AI-generated
  advisory text, not a stored fact (the backend deliberately never
  persists it onto the `Incident`, per `docs/demo.md` — the UI shouldn't
  imply otherwise, e.g. no "saved" state).
- **`/policies`**: a "Suggest with AI" flow — natural-language textarea
  input → `POST /policies/suggest` → show the drafted rules for human
  review _before_ anything is created, since the endpoint itself creates
  a real `DRAFT` `PolicyVersion` as a side effect of the call (not a
  preview-only endpoint) — read `PolicyController.suggestPolicy`'s doc
  comment in `manar-api` to get this right, don't assume it's dry-run.
  After creation, route the user to that draft's normal
  version-history/publish flow — never auto-publish from this UI either.
- **`/audit`**: an "Ask a question" input calling `POST
/audit/investigate` with whatever filter state the audit page already
  has active (reuse its existing filter fields as the query scope, per
  that endpoint's own tenant-scoped-retrieval design) → show the answer
  inline.

All three: handle `available: false` (AI unreachable / no usable
result) with a clear, calm "couldn't get an AI response right now" state
— never a raw error, never something that looks like the request failed
when it actually just means "no advisory available" (this mirrors the
backend's own fail-safe philosophy, Section 26 — the UI should reflect
that, not paper over it as a crash).

## Sequencing (for implementation)

1. **Foundation** (must land first, everything else depends on it):
   design tokens (Tailwind theme values), the `EmptyState` component,
   the redesigned `RiskMeter`/`RiskBadge`, breadcrumbs component, Cmd+K
   command palette, sidebar attention-count wiring, data-humanization
   utilities (actor-name resolution, event-type humanization).
2. **Page reworks** (can parallelize across pages once step 1 lands):
   apply the new tokens/components to every page, rebuild Overview as a
   real dashboard, fix empty states, humanize displayed data.
3. **AI buttons**: the three new features above — can happen in
   parallel with step 2 since they're additive to specific pages rather
   than a rework of them, but should follow the same visual language
   step 1 establishes.

## Testing

- Visual: real headless-browser screenshots before/after for at least
  Overview, Agents, Approvals, Audit — this is a visual change, "it
  compiles" is not sufent evidence it looks right.
- RTL: re-verify Arabic rendering isn't broken by the rework (existing
  pattern from prior phases — check `dir="rtl"` + real Arabic text still
  renders correctly).
- Functional: existing `pnpm test`/`pnpm lint`/`pnpm typecheck`/`pnpm build`
  must all still pass. The three new AI buttons need real verification
  against the real backend endpoints (not just that the button renders)
  — `available: false` path and success path both, same as prior phases'
  testing discipline.
