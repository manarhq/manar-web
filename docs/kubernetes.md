# Kubernetes

manar-web's implementation of Phase 12b ("Container/Kubernetes Hardening &
CI Security Scanning",
`manar-api/docs/superpowers/specs/2026-08-19-phase12b-container-k8s-ci-hardening-design.md`).
This is a **manifests-only** phase: `deploy/helm/manar-web/` and the CI
`security` stage below produce deployable-later artifacts. Nothing here
deploys anything anywhere, touches any real cluster, or configures
`manar.vax.sh`/DNS/TLS — that is a separate, later, explicitly-requested
phase.

## The SESSION_SECRET Dockerfile fix

Before this phase, `docker build -t manar-web:ci .` was actually broken.
`lib/env.ts`'s zod schema requires `SESSION_SECRET` (min 32 chars, no
`.default()` — every other server env var has one; this one deliberately
doesn't, so the app refuses to boot in a real environment without a real
secret). `next build` eagerly evaluates that module during page-data
collection for routes that import it transitively
(`app/api/auth/logout/route.ts` → `lib/auth/oidc.ts` → `lib/env.ts`), so
`pnpm build` — and therefore the Dockerfile's `builder` stage — threw
`Invalid environment configuration: SESSION_SECRET: Invalid input` with no
value present. Local host builds only "worked" by accident, via a
gitignored `.env.local` that happens to supply one; neither the Dockerfile
nor the CI `build` job did.

The fix is scoped to the `builder` stage only, in the Dockerfile:

```dockerfile
ARG SESSION_SECRET_BUILD_PLACEHOLDER="00000000000000000000000000000000"
ENV SESSION_SECRET=${SESSION_SECRET_BUILD_PLACEHOLDER}
```

set immediately before `RUN pnpm build`. It's a static, 32+ character
placeholder that exists only to satisfy the schema's eager validation
during the trace/compile step — never a real secret, never accepted as
untrusted input from a build caller in any meaningful way, and **not**
copied into the `runner` stage: that stage sets no `SESSION_SECRET` at all,
so a container run from the built image without one set will fail its own
`lib/env.ts` validation at boot, exactly as intended. The real value must
come from the deployed environment's Secret (`deploy/helm/manar-web/templates/secret.yaml`).
`docker build` prints a benign `SecretsUsedInArgOrEnv` linter warning on
these two lines — expected and safe to ignore, given the above.

## Container hardening audit

Re-verified as part of this phase, on top of the previous phases'
non-root/multi-stage build:

- **HEALTHCHECK**: `GET /api/health` is correct and current —
  `app/api/health/route.ts` is a real, single-endpoint, dependency-free
  liveness check (no DB/cache to gate on, unlike manar-api's separate
  `/health/live` + `/health/ready`), so both the Helm chart's liveness and
  readiness probes point at the same endpoint. No drift.
- **Base image**: `node:24-alpine`, pinned via `ARG NODE_VERSION`, not
  `latest` and not stale.
- **No secrets/`.env` copied into any image**: `.dockerignore` excludes
  `.env`, `.env.*`, `.git`, `docs`, and the CI/Dockerfile files themselves;
  confirmed by inspection, no drift.
- **Build toolchain leakage — found and fixed**: the `runner` stage
  previously shipped `node:24-alpine`'s bundled `npm`/`npx`/`corepack`/
  `yarn` (~18MB, entirely unused at runtime — the container's `CMD` is
  `node server.js`, nothing in the runtime path ever shells out to any of
  them). A `trivy image` scan against the built image surfaced this
  concretely: 7 real HIGH/CRITICAL CVEs (`CVE-2026-13149`/`-14257`/`-69152`
  in `brace-expansion`, `CVE-2026-69192` in `ip-address`, `CVE-2026-59873`/
  `-59874` in `tar`, `CVE-2026-12151` in `undici`) — all inside npm's own
  vendored `node_modules`, none in the actual application dependency tree
  (`app/node_modules/*` scanned 0 findings both before and after). The
  runtime stage now strips `/usr/local/lib/node_modules/{npm,corepack}`,
  `/usr/local/bin/{npm,npx,corepack}`, and `/opt/yarn-v*`/`/usr/local/bin/
{yarn,yarnpkg}` before the final `USER node` switch. Re-scanned after the
  fix: 0 HIGH/CRITICAL findings, `trivy image` exits 0. This is the "no
  build toolchain leaks into the final image" audit criterion applied to
  the _base image's own_ bundled tooling, not just this repo's own
  pnpm/Next.js build stages (which were already correctly excluded).
- **Non-root user**: confirmed by actually running the built image —
  `docker exec ... id` reports `uid=1000(node) gid=1000(node)`. This is
  `node:24-alpine`'s own built-in `node` user, **not** manar-api's `1001`
  — the two charts' `securityContext.runAsUser` values intentionally
  differ to match each repo's own base image.
- **Read-only root filesystem**: empirically verified, not assumed —
  `docker run --read-only --tmpfs /tmp manar-web:ci` was run and exercised
  (`/api/health`, a locale redirect on `/`, and a full page render on
  `/en/login`, all 2xx/3xx) with **only** `/tmp` mounted writable. No other
  path needs to be writable at runtime. The Helm chart's
  `securityContext.readOnlyRootFilesystem: true` mounts an `emptyDir` at
  `/tmp` accordingly.

## Chart layout

`deploy/helm/manar-web/` — one chart, one Deployment, one Service, scaffolded
with `helm create` and pruned to what this single-service, no-public-ingress-
of-its-own chart actually needs (`ingress.yaml`/`httproute.yaml`/`hpa.yaml`
removed as out of scope; see "Out of scope" below).

```
deploy/helm/manar-web/
├── Chart.yaml
├── values.yaml
├── .helmignore
└── templates/
    ├── _helpers.tpl
    ├── NOTES.txt
    ├── deployment.yaml
    ├── service.yaml
    ├── serviceaccount.yaml
    ├── configmap.yaml
    ├── secret.yaml
    ├── networkpolicy.yaml
    └── tests/
        └── test-connection.yaml
```

Assumes a single shared `manar` namespace holding manar-web, manar-api,
Keycloak, etc. — same assumption manar-api's own chart documents.

### Deployment

- `replicaCount: 1` by default (see `values.yaml`); when raised above 1, a
  soft (`preferredDuringSchedulingIgnoredDuringExecution`) pod
  anti-affinity on `kubernetes.io/hostname` spreads replicas across nodes
  automatically (`values.yaml`'s `podAntiAffinity.enabled`, applied in
  `templates/deployment.yaml` only when `replicaCount > 1` — a single
  replica has nothing to spread against, so it's skipped, not just a no-op
  block).
- Liveness and readiness probes both target `GET /api/health` (see
  "Container hardening audit" above for why there's no live/ready split).
- Resource requests/limits are Next.js-SSR-app defaults, not load-tested:
  `requests: 100m CPU / 256Mi`, `limits: 500m CPU / 512Mi`. Tune against
  real traffic before an actual deployment phase.
- `securityContext` (pod- and container-level): `runAsNonRoot: true`,
  `runAsUser`/`runAsGroup: 1000` (matches the Dockerfile's `node` user —
  see above), `readOnlyRootFilesystem: true` with an `emptyDir` at `/tmp`,
  `allowPrivilegeEscalation: false`, `capabilities.drop: [ALL]`,
  `seccompProfile.type: RuntimeDefault`.
- Env vars are injected entirely via `envFrom` (ConfigMap + Secret, see
  below) — no inline `env:` entries, so `lib/env.ts`'s schema is the single
  source of truth for what the container expects and this chart never
  duplicates/drifts from it.

### Config / Secret split

Mirrors `lib/env.ts`'s zod schema exactly (re-verified against the current
file and `.env.example`, not assumed from a stale inventory):

| Var                        | Where     | Why                                                                                                                                                                                                        |
| -------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                 | ConfigMap | not sensitive                                                                                                                                                                                              |
| `MANAR_API_BASE_URL`       | ConfigMap | in-cluster Service DNS name (`http://manar-api:3000`), same convention `.gitlab-ci.yml`'s `api-client-drift-check` job already uses                                                                        |
| `KEYCLOAK_BASE_URL`        | ConfigMap | not sensitive                                                                                                                                                                                              |
| `KEYCLOAK_ADMIN_USERNAME`  | ConfigMap | a username, not a credential itself                                                                                                                                                                        |
| `KEYCLOAK_ADMIN_CLIENT_ID` | ConfigMap | not sensitive                                                                                                                                                                                              |
| `APP_BASE_URL`             | ConfigMap | not sensitive                                                                                                                                                                                              |
| `SESSION_SECRET`           | Secret    | symmetric session-cookie encryption key                                                                                                                                                                    |
| `KEYCLOAK_ADMIN_PASSWORD`  | Secret    | **plaintext infra-operator password material**, per `.env.example`'s own comment — easy to miss since the name reads like a mundane admin username pairing, but it is credential-shaped, not config-shaped |
| `MANAR_BFF_SERVICE_TOKEN`  | Secret    | Phase 11b Part 1's shared BFF-service credential — must match manar-api's own value exactly (see docs/auth-flow.md)                                                                                        |

Phase 11b Part 1 removed `KEYCLOAK_CLIENT_ID`: manar-web now resolves each
tenant's OIDC client ID from manar-api's `GET /tenants/:slug/oidc-config`
rather than a locally-configured default (docs/auth-flow.md).

`values.yaml`'s `config.*` and `secrets.values.*` default to empty strings
(or fixed non-secret defaults like `MANAR_API_BASE_URL`) — **real secret
values must never be set in `values.yaml` or committed to any values
file.** `secrets.create: false` plus `secrets.existingSecretName: <name>`
is the escape hatch for an externally-managed Secret (sealed-secrets,
External Secrets Operator, or similar) at actual deploy time, mirroring
manar-api's own chart's pattern.

### NetworkPolicy

manar-web's real dependency graph is narrow: it never talks to Postgres,
Redis, Kafka, OpenSearch, OpenBao, OpenFGA, Temporal, manar-ai, or
demo-soc-tools — all of that is manar-api's concern, reached only
indirectly through manar-api's own HTTP API (the BFF proxy at
`app/api/bff/[...path]`). The only two things manar-web itself ever needs
to reach directly are:

1. **manar-api** — the BFF proxy forwards requests here, and codegen
   fetches its OpenAPI doc from it.
2. **Keycloak** — the OIDC authorization-code/PKCE flow (`docs/auth-flow.md`)
   and the admin-credential client-secret lookup both talk to Keycloak
   directly from the server side.

`templates/networkpolicy.yaml` grants exactly that and nothing else:

- **Ingress**: only from the Traefik ingress pods in `kube-system`
  (`app.kubernetes.io/name: traefik`, `app.kubernetes.io/instance:
traefik-kube-system`), on the http port.
- **Egress**: DNS (`kube-system`/`k8s-app: kube-dns`, 53/UDP+TCP) +
  `manar-api` in `manar-prod` (port 3000) + Keycloak in `manar-platform`
  (`app.kubernetes.io/name: keycloak`, port 8080). Nothing else; in
  particular no egress to Postgres, Redis or Kafka.

The rules are maps keyed by name in `values.yaml` (`networkPolicy.ingress`,
`networkPolicy.egress`, raw NetworkPolicy peers; `<name>.enabled: false` switches
one off from an overlay), defaulting to the
namespaces and labels agreed with the platform repo `manar/manar-infra`
(apps in `manar-prod`, backing services in `manar-platform`). A cluster with
other labels overrides the entries it needs. If Keycloak is reached through a public
hostname instead of the in-cluster Service, add an egress entry for it.

### Validation

```sh
helm lint deploy/helm/manar-web
helm template manar-web deploy/helm/manar-web --set image.tag=ci > /tmp/rendered.yaml

docker run --rm -v /tmp/rendered.yaml:/rendered.yaml:ro \
  --entrypoint /kubeconform ghcr.io/yannh/kubeconform:v0.8.0-alpine \
  -strict -summary /rendered.yaml

docker run --rm -v /tmp/rendered.yaml:/rendered.yaml:ro \
  stackrox/kube-linter:v0.8.3 lint /rendered.yaml
```

All three currently pass clean: `helm lint` (0 failed, only the stock
"icon is recommended" info notice), `kubeconform -strict` (7/7 resources
valid, 0 errors), `kube-linter` ("No lint errors found!").

## Out of scope for this chart

- **Ingress/HTTPRoute/HPA** — stripped from the `helm create` scaffold.
  Public routing and autoscaling are a separate, later, explicitly-
  requested deployment-phase concern; this phase only produces the
  Deployment/Service/Config/Secret/NetworkPolicy manifests that a later
  Ingress/HTTPRoute would point at.
- **Actual deployment** — no `helm install`/`upgrade` was run against any
  real cluster, no `manar.vax.sh` DNS/TLS configuration, no cluster
  interaction of any kind. This chart exists on disk only.

## CI security scanning

Added a `security` stage to `.gitlab-ci.yml`, appended after the existing
`lint`/`typecheck`/`test`/`build` stages (none renamed, reordered, or
removed). Every job below was run locally first, against this repo's real
Dockerfile/source/`pnpm-lock.yaml`/git history, before being wired into
CI — not written from documentation alone.

| Tool        | Purpose                                                   | Pinned version                            | Threshold                                                                                                                         |
| ----------- | --------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Trivy       | dependency scan (`pnpm-lock.yaml`) + container image scan | `aquasec/trivy:0.71.0`                    | fail on HIGH/CRITICAL, `--ignore-unfixed`; full JSON report always uploaded regardless of pass/fail                               |
| Gitleaks    | secret scanning, full commit history                      | `ghcr.io/gitleaks/gitleaks:v8.30.1`       | fail on ANY finding not in an explicit, documented `.gitleaks.toml` allowlist                                                     |
| Semgrep     | SAST                                                      | `semgrep/semgrep:1.172.0`                 | fail on ERROR severity only (`--severity ERROR --error`); WARNING/INFO reported in an always-uploaded JSON artifact, non-blocking |
| Syft        | SBOM generation (CycloneDX JSON)                          | `anchore/syft:v1.51.0`                    | artifact-only, never fails the pipeline                                                                                           |
| kubeconform | Helm-rendered manifest schema validation                  | `ghcr.io/yannh/kubeconform:v0.8.0-alpine` | fail on ANY `-strict` schema violation                                                                                            |
| kube-linter | Helm-rendered manifest best-practice/hardening lint       | `stackrox/kube-linter:v0.8.3`             | fail on any default-profile finding                                                                                               |

Same pinned versions/thresholds specified for manar-api and manar-ai's
Phase 12b work too, for consistency across all three repos. Note: at the
time this chart was built, `manar-api/deploy/helm/manar-api/` and
`manar-api/docs/kubernetes.md` were not actually present in the checked-out
`manar-api` repo (checked both the main checkout and a sibling worktree) —
despite this phase's brief describing them as already landed and usable as
a reference. This chart and CI wiring were built directly from the design
spec and the versions/thresholds specified for this task, not copied from
an actual manar-api implementation. Worth reconciling once manar-api's own
Phase 12b work actually lands, to confirm no unintended drift between the
three repos' charts.

### Job shape

- `docker:build-images` (`build` stage): `docker:29` + `docker:29-dind`,
  builds the real production image and `docker save`s it to a tarball
  artifact, so it's built exactly once per pipeline and every image-
  scanning job below just consumes the tarball instead of rebuilding.
- `trivy-fs` / `trivy-image` (`security`): run Trivy twice each — once with
  `--exit-code 0 --format json` to always produce the report artifact, once
  with `--exit-code 1 --format table` as the actual pass/fail gate. Keeps
  the artifact available even on a failing pipeline.
- `gitleaks` (`security`): `GIT_STRATEGY: clone` + `GIT_DEPTH: 0` for a full
  history clone (a shallow default clone would defeat the point of
  history scanning).
- `semgrep` (`security`): same two-pass shape as Trivy — an always-uploaded
  full-severity JSON report, then the ERROR-only blocking gate.
- `k8s-manifests:render` → `kubeconform` + `kube-linter` (`security`):
  render once (`helm lint` + `helm template`), hand the rendered YAML to
  both validators via `needs:`/artifacts so they check the exact same
  render.

### Distroless-image entrypoint/shell handling

Several of these images' default `ENTRYPOINT` is the tool binary itself,
not a shell — GitLab CI's Docker executor needs a shell in the container to
run `script:` lines, so using one of these as a job's `image:` directly
without addressing this breaks the job. Checked each pinned image
individually rather than assuming:

- **`aquasec/trivy`, `ghcr.io/gitleaks/gitleaks`, `ghcr.io/yannh/kubeconform:v0.8.0-alpine`,
  `alpine/helm`**: `ENTRYPOINT` is the binary, but the image itself _has_ a
  shell (`/bin/sh` — confirmed via `docker run --entrypoint sh <image> -c
"which <tool>"`). Fixed with a plain `entrypoint: [""]` override in the
  job's `image:` block, letting GitLab inject its own shell for `script:`
  as normal.
- **`anchore/syft`, `stackrox/kube-linter`**: confirmed **distroless**
  (`docker export` shows literally just the static binary plus a handful of
  `/etc`/`/dev`/`/proc` entries — no shell at all; `docker run --entrypoint
sh <image>` fails with `exec: "sh": executable file not found in $PATH`).
  `entrypoint: [""]` can't fix "no shell exists". `syft-sbom` and
  `kube-linter` jobs instead run on `docker:29` + `docker:29-dind` (which do
  have a shell) and extract the static binary via `docker create` (never
  started) + `docker cp` before running it directly — verified locally to
  produce correct output (SBOM component list / lint pass) exactly as
  running the image itself would.
- **`semgrep/semgrep`**: no `ENTRYPOINT` set at all (only a default `CMD`),
  so no override needed — confirmed clean as a plain `image:` job.

### Gitleaks result

Full-history scan (`git --log-opts="--all"`) is clean: 15 commits scanned,
~800.37 KB, no leaks found. Re-confirmed at the end of this phase, not just
carried over from an earlier pass. No `.gitleaks.toml` allowlist exists or
is needed.

### Trivy/Semgrep/Syft results (run locally against real build output)

- **`trivy fs` against `pnpm-lock.yaml`**: 0 HIGH/CRITICAL findings.
- **`trivy image` against the built `manar-web:ci` image**: 0 HIGH/CRITICAL
  findings — see "Container hardening audit" above for the npm/yarn
  toolchain-leak CVEs this scan originally surfaced and how they were
  fixed (not ignored/suppressed).
- **`semgrep --config auto`**: 0 findings at any severity across 142
  git-tracked files / 310 community rules run.
- **`syft`**: SBOM generation succeeds, 238 components cataloged
  (CycloneDX JSON format) from the built image.

## lint-staged / prettier note

`package.json`'s `lint-staged` config only covers
`*.{ts,tsx,js,jsx,mjs,cjs,json,css,md}` — no `.yaml`/`.yml` glob — so
editing `.gitlab-ci.yml` or any file under `deploy/helm/manar-web/` does
not currently trigger prettier's YAML formatter against Helm's Go-template
syntax — a conflict reportedly hit during manar-api's own equivalent Phase
12b work (per this phase's brief), though that repo's actual chart/config
wasn't available to independently confirm at the time this was written
(see the note in "CI security scanning" above). Worth knowing if a future
change adds a YAML glob to `lint-staged` here.
