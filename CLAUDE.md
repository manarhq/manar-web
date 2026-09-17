@AGENTS.md

# manar-web — Governance Manager console

Workspace context and the build program: `../CLAUDE.md` and `../MANAR-BUILD-SPEC.md`. Read them
first. This file holds what is specific to this repo.

## Stack

Next.js 16 (App Router, `output: standalone`), React, TypeScript, Tailwind + shadcn/ui
(`components.json`), TanStack Query, next-intl, next-themes, Vitest 4 + jsdom + Testing Library.
pnpm 11, Node 24.

## Commands (verified 2026-09-17)

| Task         | Command                                                                                                  | Baseline                                        |
| ------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Lint         | `pnpm lint`                                                                                              | 0 errors                                        |
| Format check | `pnpm format:check`                                                                                      | clean (Helm templates are in `.prettierignore`) |
| Typecheck    | `pnpm typecheck`                                                                                         | pass (`next typegen && tsc --noEmit`)           |
| Unit tests   | `pnpm test`                                                                                              | 15 files, 163 tests                             |
| Build        | `pnpm build`                                                                                             | pass                                            |
| Dev server   | `pnpm dev` (port 4200; regenerates the API client first if manar-api is reachable)                       |                                                 |
| Prod server  | `pnpm build && pnpm start` (port 4200)                                                                   |                                                 |
| API client   | `pnpm api:codegen` / `pnpm api:codegen:check` (from manar-api's live OpenAPI into `lib/api/schema.d.ts`) |                                                 |

Coverage is not configured (`@vitest/coverage-v8` is not installed). There is no Playwright test
suite and no axe yet; the spec requires both for new UI (Phase 2 onward).

Runs against manar-api on `:3000` and Keycloak from the Compose stack in
`../manar-api/deploy/docker-compose.yml`.

## Architecture map

- `app/[locale]/(app)/<area>/` — authenticated pages: `overview`, `ai-systems`, `agents`, `tasks`,
  `tools`, `approvals`, `policies`, `authorization` (decisions; currently `NotImplementedPage`),
  `audit`, `incidents`, `compliance`, `live`, `integrations`, `users`, `roles`, `settings`.
- `app/api/` — BFF routes (token handler; the browser never holds the Keycloak access token).
  See `docs/auth-flow.md`.
- `components/manar/<area>/` — feature components; shared primitives in `components/manar/*.tsx`
  and `components/ui/`.
- `hooks/use-*.ts` — TanStack Query hooks per resource (cursor pagination; the API returns no totals).
- `lib/api/` — generated `schema.d.ts` plus the typed client. Never edit `schema.d.ts` by hand.
- `messages/{en,ar}/<namespace>.json` — all user-facing strings; namespaces listed in `i18n/request.ts`.
- `deploy/helm/manar-web/`, `deploy/docker-compose.yml`, `Dockerfile`.

Module ownership: this repo owns presentation and the BFF only. Authorization, decisions and
enforcement labels are computed by manar-api; the console never derives a security state on its
own. Known limitation: overview metrics and the command palette use only the first page of each
list (Phase 0 lead 4).

## Conventions

- **i18n:** every new string goes into `messages/en` **and** `messages/ar` in the same commit.
  Locale prefix is always present; `ar` is RTL (`dir` set in `app/[locale]/layout.tsx`). Use
  logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`, `start`, `end`), never `ml-`/`mr-`/`left`/`right`.
- **Themes and density:** light and dark via next-themes (`class` attribute); `comfortable` and
  `compact` via `html[data-density]` and the `--density-*` tokens in `app/globals.css`. New
  components must work in all four combinations.
- **Accessibility:** WCAG 2.2 AA target. Semantic HTML, keyboard-operable tables and dialogs,
  visible focus, AA contrast in both themes. Do not claim conformance.
- **Enforcement labels:** show `governed` / `observed-only` / `declared-only` /
  `monitoring unavailable` exactly as the API reports them. Never imply enforcement where only
  observation exists, and never render a missing value as healthy.
- **Connectors:** only Microsoft Graph/Entra ID and Defender XDR may appear as available.
- **Banned vocabulary:** `__tests__/banned-words.test.ts` fails the test run if a message value or
  a string in `app/` or `components/` uses a banned term (list in `../CLAUDE.md` §6).
- **Tests:** Vitest files in `__tests__/*.test.ts(x)`. Security-relevant UI (approvals, labels,
  suspension) gets an honesty test that asserts what is _not_ shown as well as what is.
- **Commits:** conventional commits (commitlint + husky).
- **ADRs:** `docs/adr/ADR-NNNN-<slug>.md` from `docs/adr/ADR-0000-template.md`.

## CI

GitLab (`.gitlab-ci.yml`): lint + format check, typecheck, test, build, API client drift check
(manual), image build, Trivy, gitleaks, semgrep, SBOM, Helm render + kubeconform + kube-linter.
